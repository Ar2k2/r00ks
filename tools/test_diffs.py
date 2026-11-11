#!/usr/bin/env python3
"""Sanity checks for java_diff.py against local game files.

Run: python3 tools/test_diffs.py   (needs Java 26.3 + 26.4-snapshot-8 installed)
Pins facts that were checked by hand on 2026-11-11.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import java_diff as J

a, b = J.load('26.3'), J.load('26.4-snapshot-8')
d = J.diff(a, b)
assert 'frostbite' in d['registries']['entity']['added']
assert 'snow_bricks' in d['registries']['block']['added']
# DataVersion stamps alone must not mark structures as changed.
assert len(d['data']['changed'].get('data/minecraft/structure', [])) < 100
members = J.class_members(b['class_bytes']['net.minecraft.commands.arguments.SignedArgument'])
assert 'method:type' in members, members

print('ok')
