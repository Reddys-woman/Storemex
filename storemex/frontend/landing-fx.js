/* =========================================================
   ORGANAIZ — LANDING PAGE FX
   Cursor glow + custom cursor, magnetic/ripple buttons,
   3D tilt cards, the peeking mascot, an ambient three.js
   scene in the hero, and animated stat counters.
   Everything here is defensive: any missing API or slow
   device just quietly disables the relevant effect.
========================================================= */

(function () {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;

    if (isFinePointer) {
        document.documentElement.classList.add("has-fine-pointer");
    }

    /* ============ CURSOR GLOW + CUSTOM CURSOR ============ */
    (function cursorFx() {
        const glow = document.getElementById("cursorGlow");
        const dot = document.getElementById("cursorDot");
        const ring = document.getElementById("cursorRing");
        if (!glow || !dot || !ring) return;

        let mx = window.innerWidth / 2, my = window.innerHeight / 2;
        let gx = mx, gy = my;
        let rx = mx, ry = my;

        window.addEventListener("mousemove", function (e) {
            mx = e.clientX;
            my = e.clientY;
            dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";

            const el = document.elementFromPoint(mx, my);
            const interactive = el && el.closest && el.closest("a, button, .tilt, input, textarea, .mascot.peek");
            document.documentElement.classList.toggle("cursor-active", !!interactive);
        }, { passive: true });

        function raf() {
            gx += (mx - gx) * 0.10;
            gy += (my - gy) * 0.10;
            rx += (mx - rx) * 0.18;
            ry += (my - ry) * 0.18;
            glow.style.transform = "translate3d(" + gx + "px," + gy + "px,0)";
            ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    })();

    /* ============ MAGNETIC + RIPPLE BUTTONS ============ */
    (function magneticButtons() {
        const buttons = document.querySelectorAll(".magnetic");

        buttons.forEach(function (btn) {
            if (isFinePointer && !reduceMotion) {
                btn.addEventListener("mousemove", function (e) {
                    const rect = btn.getBoundingClientRect();
                    const relX = e.clientX - rect.left - rect.width / 2;
                    const relY = e.clientY - rect.top - rect.height / 2;
                    btn.style.transform = "translate(" + (relX * 0.18) + "px," + (relY * 0.35) + "px)";
                });
                btn.addEventListener("mouseleave", function () {
                    btn.style.transform = "translate(0,0)";
                });
            }

            btn.addEventListener("click", function (e) {
                const rect = btn.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height) * 2;
                const ripple = document.createElement("span");
                ripple.className = "btn-ripple";
                ripple.style.width = ripple.style.height = size + "px";
                ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
                ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
                btn.appendChild(ripple);
                setTimeout(function () { ripple.remove(); }, 650);
            });
        });
    })();

    /* ============ 3D TILT CARDS ============ */
    (function tiltCards() {
        if (!isFinePointer || reduceMotion) return;
        const cards = document.querySelectorAll(".tilt");

        cards.forEach(function (card) {
            let raf = null;

            card.addEventListener("mousemove", function (e) {
                if (raf) cancelAnimationFrame(raf);
                raf = requestAnimationFrame(function () {
                    const rect = card.getBoundingClientRect();
                    const px = (e.clientX - rect.left) / rect.width - 0.5;
                    const py = (e.clientY - rect.top) / rect.height - 0.5;
                    const rotY = px * 10;
                    const rotX = py * -10;
                    card.style.transform = "perspective(900px) rotateX(" + rotX + "deg) rotateY(" + rotY + "deg) translateZ(6px)";
                });
            });

            card.addEventListener("mouseleave", function () {
                if (raf) cancelAnimationFrame(raf);
                card.style.transform = "perspective(900px) rotateX(0) rotateY(0) translateZ(0)";
            });
        });
    })();

    /* ============ THE MASCOT ============ */
    (function mascot() {
        const mascotEl = document.getElementById("mascot");
        const bubble = document.getElementById("mascotBubble");
        if (!mascotEl || !bubble) return;

        const lines = [
            "Hi! I'm Pip \uD83E\uDDE0",
            "Don't lose me — capture me!",
            "Everything, organized.",
            "Nothing to forget here.",
            "Boo! Just saying hi.",
            "Your memories are safe with me."
        ];

        function randomSide() {
            return Math.random() < 0.5 ? "peek-left" : "peek-right";
        }

        function showBubble() {
            bubble.textContent = lines[Math.floor(Math.random() * lines.length)];
            bubble.classList.add("show");
            setTimeout(function () { bubble.classList.remove("show"); }, 2600);
        }

        function peek() {
            mascotEl.classList.remove("peek-left", "peek-right");
            const side = randomSide();
            mascotEl.classList.add("peek", side);

            setTimeout(showBubble, 500);

            setTimeout(function () {
                mascotEl.classList.remove("peek", side);
            }, 5200);
        }

        mascotEl.addEventListener("click", function () {
            if (mascotEl.classList.contains("peek")) {
                showBubble();
            }
        });

        // First appearance after a short delay, then on a loose interval.
        setTimeout(peek, 4000);
        setInterval(peek, reduceMotion ? 60000 : 16000);
    })();

    /* ============ ANIMATED STAT COUNTERS ============ */
    (function statCounters() {
        const stats = document.querySelectorAll(".stat");
        if (!stats.length || !("IntersectionObserver" in window)) return;

        function animateCount(numEl, target, statEl) {
            if (reduceMotion) {
                numEl.textContent = target;
                statEl.classList.add("done");
                return;
            }
            const duration = 900;
            const start = performance.now();
            function tick(now) {
                const progress = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                numEl.textContent = Math.round(target * eased);
                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    statEl.classList.add("done");
                }
            }
            requestAnimationFrame(tick);
        }

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                const statEl = entry.target;
                const numEl = statEl.querySelector(".stat-num");
                const target = parseInt(numEl.getAttribute("data-count"), 10) || 0;
                animateCount(numEl, target, statEl);
                observer.unobserve(statEl);
            });
        }, { threshold: 0.4 });

        stats.forEach(function (s) { observer.observe(s); });
    })();

    /* ============ AMBIENT 3D SCENE (three.js) ============ */
    (function heroScene() {
        const canvas = document.getElementById("heroCanvas");
        if (!canvas || typeof THREE === "undefined" || reduceMotion) return;

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        } catch (err) {
            return; // WebGL unavailable — silently skip the ambient scene.
        }

        const heroSection = canvas.closest(".hero-section");
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        camera.position.z = 9;

        function size() {
            const rect = heroSection.getBoundingClientRect();
            renderer.setSize(rect.width, rect.height, false);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            camera.aspect = rect.width / Math.max(rect.height, 1);
            camera.updateProjectionMatrix();
        }
        size();
        window.addEventListener("resize", size);

        const geo = new THREE.IcosahedronGeometry(3.4, 1);
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x9B7BF6,
            wireframe: true,
            transparent: true,
            opacity: 0.35
        });
        const mesh = new THREE.Mesh(geo, wireMat);
        mesh.position.set(3.2, 0.4, 0);
        scene.add(mesh);

        const geo2 = new THREE.IcosahedronGeometry(1.6, 0);
        const wireMat2 = new THREE.MeshBasicMaterial({
            color: 0xF0A93E,
            wireframe: true,
            transparent: true,
            opacity: 0.22
        });
        const mesh2 = new THREE.Mesh(geo2, wireMat2);
        mesh2.position.set(-3.6, -1.4, -2);
        scene.add(mesh2);

        let targetX = 0, targetY = 0;
        window.addEventListener("mousemove", function (e) {
            targetX = (e.clientX / window.innerWidth - 0.5);
            targetY = (e.clientY / window.innerHeight - 0.5);
        }, { passive: true });

        let running = true;
        const io = new IntersectionObserver(function (entries) {
            running = entries[0].isIntersecting;
        });
        io.observe(heroSection);

        function animate() {
            requestAnimationFrame(animate);
            if (!running) return;
            mesh.rotation.y += 0.0022;
            mesh.rotation.x += 0.0012;
            mesh2.rotation.y -= 0.0018;
            mesh2.rotation.x += 0.0009;

            camera.position.x += (targetX * 1.4 - camera.position.x) * 0.02;
            camera.position.y += (-targetY * 1.4 - camera.position.y) * 0.02;
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        }
        animate();
    })();

})();
