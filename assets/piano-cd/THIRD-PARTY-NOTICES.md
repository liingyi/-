# Piano archive dependencies

Three.js 0.180.0 core/renderer, RoomEnvironment and HDRLoader are bundled in runtime.js under the MIT license. See THREE-LICENSE.txt. No CDN requests are needed. The scene uses an isolated module namespace; it does not assign window.THREE.

studio_small_03_1k.hdr is by Poly Haven, CC0: https://polyhaven.com/a/studio_small_03 . It is embedded locally. A failed HDR parse retains the generated RoomEnvironment. Piano reflections are generated independently.

Animation uses the existing site's local GSAP 3.13.0 distribution under the GSAP Standard License: https://gsap.com/standard-license/ . No additional GSAP version, gray-model scene or comparison code is shipped with this module.
