// style
import "./style.css";
import "./dat-gui.css";

// import * as three from "three";
import ForceGraph3D from "3d-force-graph";
import {
  TextureLoader,
  RepeatWrapping,
  EquirectangularReflectionMapping,
  Mesh,
  SphereGeometry,
  IcosahedronGeometry,
  MeshPhysicalMaterial,
  DoubleSide,
  BoxGeometry,
  Vector2,
  LineBasicMaterial,
  MeshBasicMaterial,
  Object3D,
  BufferGeometry,
  Line,
  ShapeGeometry,
} from "three";
import { assignNodeColors } from "./assignNodeColors.js";

import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass.js";

import * as dat from "dat.gui";

import forceLimit from "d3-force-limit";

import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";

function resizeGraph() {
  if (Graph) {
    var height = document.getElementById("graph-3d").clientHeight;
    var width = document.getElementById("graph-3d").clientWidth;

    Graph.width(width);
    Graph.height(height);
    Graph.controls().handleResize();
  }
}

window.onresize = resizeGraph;

// load some textures
const hdrEquirect = new RGBELoader().load(
  "./src/empty_warehouse_01_1k.hdr",
  () => {
    hdrEquirect.mapping = EquirectangularReflectionMapping;
  }
);

const textureLoader = new TextureLoader();
const normalMapTexture = textureLoader.load("./lib/normal.jpg");
normalMapTexture.wrapS = RepeatWrapping;
normalMapTexture.wrapT = RepeatWrapping;
// normalMapTexture.repeat.set(1, 1);

const Graph = ForceGraph3D()(document.getElementById("graph-3d"))
  .nodeId("id")
  .linkSource("from")
  .linkTarget("to")
  .nodeLabel("name")
  .nodeVal((n) => {
    return 1.4 ** n.size;
  })
  .nodeThreeObject(
    (n) =>
      new Mesh(
        n.category == "institution" || n.category == "person"
          ? new SphereGeometry(1 + n.size, 0)
          : new IcosahedronGeometry(1 + n.size, 0),
        new MeshPhysicalMaterial({
          // color: Math.round(Math.random() * Math.pow(2, 24)),
          color: n.unknown ? 0x171717 : assignNodeColors(n.community),
          side: DoubleSide,
          // clearcoat: 1.0,
          // clearcoatRoughness: 0.5,
          // metalness: 0.9,
          // roughness: 0.5,
          // reflectivity: 1,
          // envMap: hdrEquirect,
          // envMapIntensity: 0.5,
        })
      )
  )
  .nodeOpacity(0.7)
  .nodeAutoColorBy("community")
  .linkLabel("edge_type")
  .linkAutoColorBy("edge_type")
  .linkWidth((e) => e.edge_importance_normalised + 0.4)
  .linkCurvature(0.2)
  .linkOpacity(0.5)
  // .linkCurvature(({ id }) => Math.random() * 0.7)
  // .linkCurveRotation(({ id }) => Math.random() * 2 * Math.PI)
  // .linkResolution(2)
  // .backgroundColor("#0000ff")
  .backgroundColor("#171717")
  // Click on node to approach it
  .onNodeClick((node) => {
    const distance = 40;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

    Graph.cameraPosition(
      {
        // new position
        x: node.x * distRatio,
        y: node.y * distRatio,
        z: node.z * distRatio,
      },
      node, // lookAt ({ x, y, z })
      3000 // ms transition duration
    );
  });

// initialise in 3d mode
Graph.onEngineTick(() => {
  show3dMode();
  Graph.onEngineTick(() => {});
});

// // get data
const gData = fetch("./data/wiki.json").then((r) => r.json());
gData.then((data) => Graph.graphData(data));

// Passes
// const filmPass = new FilmPass(
//   0.2, // noise intensity
//   0, // scanline intensity
//   0, // scanline count
//   false // grayscale
// );
// Graph.postProcessingComposer().addPass(filmPass);

document.addEventListener("keydown", onDocumentKeyDown, false);
function onDocumentKeyDown(event) {
  var keyCode = event.which;
  if (
    keyCode == 81 // q for refit view
  ) {
    Graph.zoomToFit(
      3000 // ms transition duration
    );
  } else if (keyCode == 82) {
    setZPosition();
  } else if (keyCode == 83) {
    Graph.graphData(gData.nodes.filter((n) => n.unknown));
  }
}

// fog
// let fogColor = new THREE.Color(0x171717);
// Graph.scene().fog = new THREE.Fog(fogColor, 100, 1500);

// // unknown center
const blackholeGeometry = new IcosahedronGeometry(130, 0);
const blackholeMaterial = new MeshPhysicalMaterial({
  roughness: 0.2,
  transmission: 1,
  thickness: 0.1, // Add refraction!
  envMap: hdrEquirect,
  envMapIntensity: 0.5,
  // normalScale: new THREE.Vector2(0.1),
  // normalMap: normalMapTexture,
  // clearcoatNormalMap: normalMapTexture,
  // clearcoatNormalScale: new THREE.Vector2(1),
});
const blackhole = new Mesh(blackholeGeometry, blackholeMaterial);
Graph.scene().add(blackhole);

// plane
const planeGeometry = new BoxGeometry(1000, 1000, 20);
const planeMaterial = new MeshPhysicalMaterial({
  color: 0x777777,
  roughness: 0.2,
  transmission: 1,
  thickness: 1,
  reflectivity: 0.1,
  envMap: hdrEquirect,
  envMapIntensity: 0.5,
  // normalScale: new THREE.Vector2(1),
  // normalMap: normalMapTexture,
  // clearcoatNormalMap: normalMapTexture,
  // clearcoatNormalScale: new THREE.Vector2(1),
});
const plane = new Mesh(planeGeometry, planeMaterial);
// mesh.position.set(0, 0, -200);
Graph.scene().add(plane);
plane.visible = false;

// map plane
const mercatorMapTexture = textureLoader.load("./lib/mercator-strange.jpg");
// mercatorMapTexture.wrapS = THREE.RepeatWrapping;
// mercatorMapTexture.wrapT = THREE.RepeatWrapping;
const mapGeometry = new BoxGeometry(2000, 1000, 20);
const mapMaterial = new MeshPhysicalMaterial({
  color: 0x777777,
  roughness: 0.6,
  transmission: 1,
  thickness: 1,
  reflectivity: 0.1,
  envMap: hdrEquirect,
  envMapIntensity: 0.5,
  // envMapIntensity: 0.5,
  normalScale: new Vector2(1),
  normalMap: mercatorMapTexture,
  // clearcoatNormalMap: mercatorMapTexture,
  // clearcoatNormalScale: new THREE.Vector2(1),
});
const map = new Mesh(mapGeometry, mapMaterial);
// map.position.set(0, 0, -40);
Graph.scene().add(map);
map.visible = false;

// gui

/* dat.GUI copies the prototype of superclass Controller to all other controllers, so it is not enough to add it only to
      the super class as the reference is not maintained */
var eachController = function (fnc) {
  for (var controllerName in dat.controllers) {
    if (dat.controllers.hasOwnProperty(controllerName)) {
      fnc(dat.controllers[controllerName]);
    }
  }
};

var setTitle = function (v) {
  // __li is the root dom element of each controller
  if (v) {
    this.__li.setAttribute("title", v);
  } else {
    this.__li.removeAttribute("title");
  }
  return this;
};

eachController(function (controller) {
  if (!controller.prototype.hasOwnProperty("title")) {
    controller.prototype.title = setTitle;
  }
});

var gui = new dat.GUI();
var parameters = {
  mode: "3d",
  filterNodes: "none",
  rotate: false,
};

var mode = gui
  .add(parameters, "mode", { "3D": "3d", "2D": "2d", Geo: "geo" })
  .name("Mode")
  .title(
    "There are three modes: 3D shows a ball of unknowns at the center; 2D separates the known from unknowns along a plane and Geo shows the values geolocated."
  )
  .listen();
var filterNodes = gui
  .add(parameters, "filterNodes", [
    "none",
    "dataset",
    "deployment",
    "technology",
    "institution",
  ])
  .name("Filter nodes")
  .title("Show only nodes of this type.")
  .listen();
var rotate = gui
  .add(parameters, "rotate")
  .name("Auto-rotate")
  .title("Automatically rotates the camera around the graph.")
  .listen();

// mode
const unknownSphereRadius = 100;
const knownSphereRadius = null;
function constrainToSphere(radius, coord_1, coord_2) {
  return Math.sqrt(radius ** 2 - coord_1 ** 2 - coord_2 ** 2);
}
function nodePosition(unknown, coord_1, coord_2) {
  return unknown
    ? constrainToSphere(unknownSphereRadius, coord_1, coord_2)
    : constrainToSphere(knownSphereRadius, coord_1, coord_2);
}

function show3dMode() {
  Graph.d3Force(
    "limit",
    forceLimit()
      .radius((node) => node.size)
      .x0((n) => -nodePosition(n.unknown, n.y, n.z))
      .x1((n) => nodePosition(n.unknown, n.y, n.z))
      .y0((n) => -nodePosition(n.unknown, n.x, n.z))
      .y1((n) => nodePosition(n.unknown, n.x, n.z))
      .z0((n) => -nodePosition(n.unknown, n.x, n.y))
      .z1((n) => nodePosition(n.unknown, n.x, n.y))
      .cushionWidth(0)
      .cushionStrength(0.0001)
  ).cameraPosition({ x: 0, y: 0, z: 1500 });
  blackhole.visible = true;
  plane.visible = false;
  map.visible = false;
}

function show2dMode() {
  Graph.d3Force(
    "limit",
    forceLimit()
      .radius((node) => node.size)
      .x0((n) => -10000)
      .x1((n) => 10000)
      .y0((n) => -10000)
      .y1((n) => 10000)
      .z0((n) => (n.unknown ? -150 : 50))
      .z1((n) => (n.unknown ? -50 : 90))
      .cushionWidth(0)
      .cushionStrength(0.0001)
  ).cameraPosition({ x: 0, y: 0, z: 1500 });
  blackhole.visible = false;
  plane.visible = true;
  map.visible = false;
}

function longitudeToScreenTarget(longitude) {
  return 10 * longitude;
}

function latitudeToScreenTarget(latitude) {
  return 20 * (latitude - 45);
}

function constrainToCircle(radius, coord_2_actual, coord_2_target) {
  return Math.sqrt(radius ** 2 - (coord_2_actual - coord_2_target) ** 2);
}

const circleRadius = 10;

function showGeoMode() {
  Graph.d3Force(
    "limit",
    forceLimit()
      .radius((node) => node.size)
      .x0((n) =>
        n.longitude == null
          ? -10000
          : longitudeToScreenTarget(n.longitude) -
            constrainToCircle(
              circleRadius,
              n.y,
              latitudeToScreenTarget(n.latitude)
            )
      )
      .x1((n) =>
        n.longitude == null
          ? 10000
          : longitudeToScreenTarget(n.longitude) +
            constrainToCircle(
              circleRadius,
              n.y,
              latitudeToScreenTarget(n.latitude)
            )
      )
      .y0((n) =>
        n.latitude == null
          ? -10000
          : latitudeToScreenTarget(n.latitude) -
            constrainToCircle(
              circleRadius,
              n.x,
              longitudeToScreenTarget(n.longitude)
            )
      )
      .y1((n) =>
        n.latitude == null
          ? 10000
          : latitudeToScreenTarget(n.latitude) +
            constrainToCircle(
              circleRadius,
              n.x,
              longitudeToScreenTarget(n.longitude)
            )
      )
      .z0((n) => (n.unknown ? -150 : 50))
      .z1((n) => (n.unknown ? -50 : 90))
      .cushionWidth(0)
      .cushionStrength(100)
  ).cameraPosition({ x: 0, y: 0, z: 1500 });
  blackhole.visible = false;
  plane.visible = false;
  map.visible = true;
}

mode.onChange((modeNewValue) => {
  if (modeNewValue == "3d") {
    show3dMode();
  } else if (modeNewValue == "2d") {
    show2dMode();
  } else if (modeNewValue == "geo") {
    showGeoMode();
  }
  Graph.d3ReheatSimulation();
});

filterNodes.onFinishChange((newFilterNodesValue) => {
  // console.log(gData);
  gData.then((data) => {
    if (newFilterNodesValue == "none") {
      Graph.graphData(data);
    } else {
      const filteredNodes = data.nodes.filter(
        (n) => n.category == newFilterNodesValue
      );
      // console.log(filteredNodes);
      const filteredNodesIds = [];
      JSON.stringify(filteredNodes, (key, value) => {
        if (key === "id") filteredNodesIds.push(value);
        return value;
      });
      // console.log(filteredNodesIds);
      const filteredLinks = data.links.filter(
        (e) =>
          filteredNodesIds.includes(e.source.id) &
          filteredNodesIds.includes(e.target.id)
      );
      // console.log(filteredLinks);
      const filteredData = { nodes: filteredNodes, links: filteredLinks };
      console.log(filteredData);
      Graph.graphData(filteredData);
    }
  });
  Graph.graphData().nodes.forEach((n) => {
    n.x = 100 * Math.random();
    n.y = 100 * Math.random();
    n.z = 100 * Math.random();
  });
});

// rotation
let angle = 0;
const distance = 1000;
rotate.onChange((newValue) => {
  setInterval(() => {
    if (parameters.rotate) {
      Graph.cameraPosition({
        x: distance * Math.sin(angle),
        z: distance * Math.cos(angle),
      });
      angle += Math.PI / 300;
    }
  }, 16);
});

// title
const loader = new FontLoader();
loader.load("./lib/helvetiker_regular.typeface.json", function (font) {
  const color = 0x006699;

  const matDark = new LineBasicMaterial({
    color: color,
    side: DoubleSide,
  });

  const matLite = new MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.9,
    side: DoubleSide,
  });

  const message = "SECURITY VISION";

  const shapes = font.generateShapes(message, 20); // font size

  const geometry = new ShapeGeometry(shapes);

  geometry.computeBoundingBox();

  const xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

  const textHeight = 0;
  const textDepth = 1350;

  geometry.translate(xMid, textHeight, textDepth);

  // make shape ( N.B. edge view not visible )

  const text = new Mesh(geometry, matLite);
  text.position.z = -10;
  Graph.scene().add(text);

  // make line shape ( N.B. edge view remains visible )

  const holeShapes = [];

  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];

    if (shape.holes && shape.holes.length > 0) {
      for (let j = 0; j < shape.holes.length; j++) {
        const hole = shape.holes[j];
        holeShapes.push(hole);
      }
    }
  }

  shapes.push.apply(shapes, holeShapes);

  const lineText = new Object3D();

  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];

    const points = shape.getPoints();
    const geometry = new BufferGeometry().setFromPoints(points);

    geometry.translate(xMid, textHeight, textDepth);

    const lineMesh = new Line(geometry, matDark);
    lineText.add(lineMesh);
  }

  Graph.scene().add(lineText);
});