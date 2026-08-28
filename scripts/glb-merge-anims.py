#!/usr/bin/env python3
"""Merge animations from several GLBs that share one rig into a single GLB.

Tripo exports one file per animation clip: same mesh, same skeleton, one clip each.
This copies the extra clips' animation data into the first file, so three 30MB
downloads become one GLB carrying three named actions for THREE.AnimationMixer.

Usage: glb-merge-anims.py out.glb base.glb:idle extra.glb:hurt[:1.9:3.9] ...
Each input is path:name[:start:end], where start/end trim the clip in SECONDS and
the kept range is rebased to start at zero.

Tripo's presets open with a run-in from several units away, so an untrimmed clip
teleports the enemy and walks it into place. Root translation is locked to its
value at the trim start for the same reason: enemies stand where the game puts
them, not where the clip's root track wanders.

ponytail: assumes identical node lists across inputs (asserted, not remapped) and
tightly-packed animation accessors. Both hold for Tripo retarget exports; a source
with interleaved animation buffers would need a gather step.
"""
import json
import struct
import sys

COMP_SIZE = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
TYPE_COUNT = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def read_glb(path):
    with open(path, "rb") as fh:
        data = fh.read()
    if data[:4] != b"glTF":
        raise ValueError(f"{path} is not a GLB")
    js = bin_chunk = None
    off = 12
    while off < len(data):
        clen, ctype = struct.unpack("<II", data[off:off + 8])
        chunk = data[off + 8:off + 8 + clen]
        if ctype == 0x4E4F534A:
            js = json.loads(chunk)
        elif ctype == 0x004E4942:
            bin_chunk = chunk
        off += 8 + clen + (-clen % 4)
    return js, bytearray(bin_chunk or b"")


def write_glb(path, js, blob):
    js["buffers"] = [{"byteLength": len(blob)}]
    jb = json.dumps(js, separators=(",", ":")).encode()
    jb += b" " * (-len(jb) % 4)
    blob = bytes(blob) + b"\x00" * (-len(blob) % 4)
    total = 12 + 8 + len(jb) + 8 + len(blob)
    with open(path, "wb") as fh:
        fh.write(b"glTF" + struct.pack("<II", 2, total))
        fh.write(struct.pack("<II", len(jb), 0x4E4F534A) + jb)
        fh.write(struct.pack("<II", len(blob), 0x004E4942) + blob)


def node_signature(js):
    """Node identity for cross-file comparison.

    Tripo names the root mesh node after the export job, so that one name differs
    between clip downloads of the same character. Everything that matters for
    animation targeting (order, hierarchy, bone names) is compared.
    """
    sig = []
    for n in js["nodes"]:
        name = n.get("name") or ""
        if name.startswith("tripo_node_"):
            name = "<mesh>"
        sig.append((name, tuple(n.get("children", [])), "mesh" in n, "skin" in n))
    return sig


def read_accessor(idx, js, blob):
    """Return an accessor's values as a list of tuples (one per element)."""
    acc = js["accessors"][idx]
    if acc["componentType"] != 5126:
        raise ValueError("only float animation accessors are supported")
    view = js["bufferViews"][acc["bufferView"]]
    n = TYPE_COUNT[acc["type"]]
    stride = 4 * n
    if view.get("byteStride") not in (None, stride):
        raise ValueError("interleaved animation accessor, not supported")
    start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    flat = struct.unpack_from(f"<{acc['count'] * n}f", blob, start)
    return [tuple(flat[i * n:(i + 1) * n]) for i in range(acc["count"])]


def write_accessor(values, kind, js, blob):
    """Append values as a new float accessor, return its index."""
    n = TYPE_COUNT[kind]
    flat = [c for v in values for c in v]
    payload = struct.pack(f"<{len(flat)}f", *flat)

    blob.extend(b"\x00" * (-len(blob) % 4))
    js["bufferViews"].append(
        {"buffer": 0, "byteOffset": len(blob), "byteLength": len(payload)}
    )
    blob.extend(payload)

    acc = {
        "bufferView": len(js["bufferViews"]) - 1,
        "componentType": 5126,
        "count": len(values),
        "type": kind,
    }
    if kind == "SCALAR" and values:  # samplers need input min/max
        acc["min"] = [min(v[0] for v in values)]
        acc["max"] = [max(v[0] for v in values)]
    js["accessors"].append(acc)
    return len(js["accessors"]) - 1


def slice_samples(times, values, start, end):
    """Keep samples inside [start, end], rebased to zero. Always keeps one."""
    kept = [(t, v) for t, v in zip(times, values) if start <= t[0] <= end]
    if not kept:
        kept = [(times[0], values[0])]
    base = kept[0][0][0]
    return [(t[0] - base,) for t, _ in kept], [v for _, v in kept]


def root_node(js):
    for i, n in enumerate(js["nodes"]):
        if n.get("name") == "Root":
            return i
    return None


def add_clip(src_js, src_bin, anim, name, span, js, blob):
    """Copy one animation into js/blob, trimmed and with its root locked."""
    start, end = span if span else (float("-inf"), float("inf"))
    root = root_node(src_js)
    samplers, channels = [], []
    for chan in anim["channels"]:
        s = anim["samplers"][chan["sampler"]]
        if s.get("interpolation", "LINEAR") == "CUBICSPLINE":
            raise ValueError("cubic spline samplers are not supported")
        times = read_accessor(s["input"], src_js, src_bin)
        values = read_accessor(s["output"], src_js, src_bin)
        times, values = slice_samples(times, values, start, end)
        target = chan["target"]
        if target["path"] == "translation" and target["node"] == root:
            # Pin to the rest pose, not to values[0]: each preset starts the root
            # somewhere else, so per-clip locking would jump the body between clips.
            rest = tuple(src_js["nodes"][root].get("translation", [0.0, 0.0, 0.0]))
            values = [rest] * len(values)
        samplers.append({
            "input": write_accessor(times, "SCALAR", js, blob),
            "output": write_accessor(values, "VEC4" if len(values[0]) == 4 else "VEC3", js, blob),
            "interpolation": s.get("interpolation", "LINEAR"),
        })
        channels.append({"sampler": len(samplers) - 1, "target": target})
    js["animations"].append({"name": name, "samplers": samplers, "channels": channels})
    return max(t[-1][0] for t in [read_accessor(s["input"], js, blob) for s in samplers])


def merge(out_path, inputs):
    base_path = inputs[0][0]
    js, blob = read_glb(base_path)
    signature = node_signature(js)
    sources = [(js, bytes(blob), inputs[0])]
    for path, name, span in inputs[1:]:
        src_js, src_bin = read_glb(path)
        if node_signature(src_js) != signature:
            raise ValueError(f"{path} has a different node list than {base_path}")
        sources.append((src_js, src_bin, (path, name, span)))

    originals = js.get("animations", [])
    js["animations"] = []
    out = []
    for src_js, src_bin, (path, name, span) in sources:
        anims = originals if src_js is js else src_js.get("animations", [])
        for anim in anims:
            dur = add_clip(src_js, src_bin, anim, name or anim.get("name", "clip"), span, js, blob)
            out.append((name, round(dur, 2)))

    write_glb(out_path, js, blob)
    return out


def parse_input(arg):
    parts = arg.split(":")
    path = parts[0]
    name = parts[1] if len(parts) > 1 and parts[1] else None
    span = (float(parts[2]), float(parts[3])) if len(parts) > 3 else None
    return path, name, span


def main(argv):
    if len(argv) < 3:
        sys.exit(__doc__)
    clips = merge(argv[1], [parse_input(a) for a in argv[2:]])
    print(f"{argv[1]} <- " + ", ".join(f"{n} ({d}s)" for n, d in clips))


def demo():
    """Self-check: trimming halves a clip and the root track stops moving."""
    import os
    import tempfile
    src = os.path.join(os.path.dirname(__file__), "..", "arcade-src", "glb", "vcop2", "civ-fall.glb")
    src = os.path.abspath(src)
    if not os.path.exists(src):
        print("demo skipped, no sample GLB")
        return
    with tempfile.NamedTemporaryFile(suffix=".glb", delete=False) as tmp:
        out = tmp.name
    clips = merge(out, [(src, "whole", None), (src, "half", (0.0, 1.5))])
    assert [c[0] for c in clips] == ["whole", "half"], clips
    assert clips[1][1] < clips[0][1], clips  # the trim actually shortened it

    js, blob = read_glb(out)
    assert len(js["animations"]) == 2
    root = root_node(js)
    for anim in js["animations"]:
        for chan in anim["channels"]:
            s = anim["samplers"][chan["sampler"]]
            times = read_accessor(s["input"], js, blob)
            values = read_accessor(s["output"], js, blob)
            assert times and values and len(times) == len(values)
            assert abs(times[0][0]) < 1e-6, "clip must start at t=0"
            if chan["target"]["path"] == "translation" and chan["target"]["node"] == root:
                assert len(set(values)) == 1, "root translation must be locked"
    os.remove(out)
    print("demo ok:", clips)


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--demo":
        demo()
    else:
        main(sys.argv)
