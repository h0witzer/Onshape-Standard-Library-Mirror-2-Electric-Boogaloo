# onshape-std-library (clean mirror)

A clean, self-maintained mirror of the [Onshape FeatureScript standard library](https://cad.onshape.com/documents/12312312345abcabcabcdeff).
One commit per canonical std-library version; version numbers in imports are stripped to `✨` so
version-to-version diffs show only real code changes.

Updated via a browser-session pipeline (Playwright) that reads the library through a logged-in
Onshape session — no developer API key, so it does not consume the annual API quota. This replaces
the original (now unmaintained) javawizard importer as the update source.

The FeatureScript standard library is distributed by PTC/Onshape under the MIT License (see LICENSE.txt).
