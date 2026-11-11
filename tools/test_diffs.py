#!/usr/bin/env python3
"""Sanity checks for java_diff.py and bedrock_diff.py against local game files.

Run: python3 tools/test_diffs.py   (needs Java 26.3 + 26.4-snapshot-8 installed and the bedrock-samples cache)
Pins facts that were checked by hand on 2026-11-11.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import java_diff as J, bedrock_diff as B

a, b = J.load('26.3'), J.load('26.4-snapshot-8')
d = J.diff(a, b)
assert 'frostbite' in d['registries']['entity']['added']
assert 'snow_bricks' in d['registries']['block']['added']
# DataVersion stamps alone must not mark structures as changed.
assert len(d['data']['changed'].get('data/minecraft/structure', [])) < 100
members = J.class_members(b['class_bytes']['net.minecraft.commands.arguments.SignedArgument'])
assert 'method:type' in members, members

old, new = B.resolve('release', '1.26.70.23')
assert (old, new) == ('v1.26.60.5', 'v1.26.70.23-preview'), (old, new)
bd = B.diff(old, new)
assert 'minecraft:snow_bricks' in bd['registries']['blocks']['added']
assert bd['lang']['added']['entity.frostbite.name'] == 'Frostbite'
print('ok')
