/* =========================
   SCENE SETUP
========================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f5f5); // prevents white flash

/* CAMERA */
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 0, 11);

/* RENDERER */
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xffffff, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.getElementById("shelf-scene").appendChild(renderer.domElement);

/* =========================
   MOUSE PARALLAX
========================= */
const mouseParallax = { x: 0, y: 0 };

window.addEventListener("mousemove", (e) => {
  mouseParallax.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouseParallax.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

/* =========================
   TEXTURE LOADER
========================= */
const loadingManager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(loadingManager);

loadingManager.onLoad = () => {
  // Force one clean render frame
  renderer.render(scene, camera);
  animate();
};

/* =========================
   BACKGROUND (FIRST)
========================= */

// WALL
const wallTexture = loader.load("image/white-bricks-wall-texture.jpg");
wallTexture.colorSpace = THREE.SRGBColorSpace;

const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 20),
  new THREE.MeshBasicMaterial({ map: wallTexture }),
);
wall.position.set(0, 1, -5);
wall.renderOrder = 0;
scene.add(wall);

wallTexture.generateMipmaps = false;
wallTexture.minFilter = THREE.LinearFilter;
wallTexture.magFilter = THREE.LinearFilter;
wallTexture.wrapS = wallTexture.wrapT = THREE.ClampToEdgeWrapping;

// FLOOR
const floorTexture = loader.load("image/wooden-texture.jpg");
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(4, 4);
floorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(32, 32),
  new THREE.MeshBasicMaterial({ map: floorTexture }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, -3.5, -2);
floor.renderOrder = 1;
scene.add(floor);

/* =========================
   SHELF
========================= */
const shelfTexture = loader.load("image/shelf.png");
shelfTexture.colorSpace = THREE.SRGBColorSpace;
shelfTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

const shelf = new THREE.Mesh(
  new THREE.PlaneGeometry(6, 6),
  new THREE.MeshBasicMaterial({
    map: shelfTexture,
    transparent: true,
    depthWrite: false,
  }),
);
shelf.position.set(0, 0, 0);
shelf.renderOrder = 2;
scene.add(shelf);

/* =========================
   BOOK CREATOR
========================= */
function addBook({ image, x, y, link }) {
  const texture = loader.load(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const book = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 1),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );

  book.position.set(x, y, 0.25);
  book.renderOrder = 3;

  book.userData = {
    link,
    baseX: x,
    baseY: y,
    baseZ: 0.25,
  };

  scene.add(book);
  return book;
}

/* =========================
   ADD BOOKS
========================= */
const books = [
  addBook({ image: "image/faisal1.png", x: -2.35, y: 2.06, link: "#" }),
  addBook({ image: "image/abp3.png", x: 2.4, y: 1.55, link: "#" }),
  addBook({ image: "image/qpat2.png", x: -0.11, y: 0.95, link: "#" }),
  addBook({ image: "image/palms4.png", x: 1.65, y: -1.3, link: "#" }),
  addBook({ image: "image/urbanhive5.png", x: -2.3, y: -2.3, link: "#" }),
];

/* =========================
   INTERACTION (HOVER)
========================= */
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredBook = null;

window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

function handleHover() {
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(books);

  if (hits.length) {
    const book = hits[0].object;
    if (hoveredBook !== book) {
      if (hoveredBook) resetBook(hoveredBook);
      hoveredBook = book;
      liftBook(book);
      document.body.style.cursor = "pointer";
    }
  } else {
    if (hoveredBook) resetBook(hoveredBook);
    hoveredBook = null;
    document.body.style.cursor = "default";
  }
}

function liftBook(book) {
  gsap.to(book.position, {
    z: 0.7,
    y: book.userData.baseY + 0.1,
    duration: 0.4,
    ease: "power3.out",
  });
}

function resetBook(book) {
  gsap.to(book.position, {
    z: book.userData.baseZ,
    y: book.userData.baseY,
    duration: 0.4,
    ease: "power3.out",
  });
}

/* =========================
   MAIN RENDER LOOP
========================= */
function animate() {
  handleHover();

  const strength = 0.3;

  // Shelf parallax
  shelf.position.x +=
    (mouseParallax.x * strength * 0.4 - shelf.position.x) * 0.08;
  shelf.position.y +=
    (mouseParallax.y * strength * 0.2 - shelf.position.y) * 0.08;

  // Book parallax
  books.forEach((book) => {
    book.position.x +=
      (book.userData.baseX + mouseParallax.x * strength - book.position.x) *
      0.08;

    book.position.y +=
      (book.userData.baseY +
        mouseParallax.y * strength * 0.4 -
        book.position.y) *
      0.08;
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

/* =========================
   RESIZE HANDLER
========================= */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(() => {
  const hint = document.querySelector(".hint-back");
  if (!hint) return;

  let mouseX = 0;
  let mouseY = 0;
  let hintX = 0;
  let hintY = 0;
  const speed = 0.1; // lag speed

  // get hint dimensions
  const hintRect = hint.getBoundingClientRect();
  const offsetX = hintRect.width / 2;
  const offsetY = hintRect.height / 2;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.pageX - offsetX; // center hint
    mouseY = e.pageY - offsetY;
  });

  function animateHint() {
    hintX += (mouseX - hintX) * speed;
    hintY += (mouseY - hintY) * speed;

    hint.style.transform = `translate3d(${hintX}px, ${hintY}px, 0)`;

    requestAnimationFrame(animateHint);
  }

  animateHint();

  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "b") {
      gsap.to("body", {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
        onComplete: () => {
          window.location.href = "index.html";
        },
      });
    }
  });
})();
