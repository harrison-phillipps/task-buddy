import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function Companion3D({ type, size = 120 }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animationIdRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x8B5CF6, 0.5);
    pointLight.position.set(-3, 2, 3);
    scene.add(pointLight);

    // Create companion based on type
    let companion;
    switch (type) {
      case 'cat':
        companion = createCat();
        break;
      case 'dog':
        companion = createDog();
        break;
      case 'orb':
        companion = createOrb();
        break;
      case 'robot':
        companion = createRobot();
        break;
      default:
        companion = createRobot();
    }
    
    scene.add(companion);

    // Animation
    let time = 0;
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      time += 0.01;
      
      // Gentle floating animation
      companion.position.y = Math.sin(time) * 0.1;
      companion.rotation.y = Math.sin(time * 0.5) * 0.2;
      
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [type, size]);

  return <div ref={containerRef} className="flex items-center justify-center" />;
}

// Cat companion
function createCat() {
  const cat = new THREE.Group();

  // Body
  const bodyGeometry = new THREE.SphereGeometry(0.8, 32, 32);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xF59E0B, 
    roughness: 0.7,
    metalness: 0.1 
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.scale.set(1, 0.9, 1);
  cat.add(body);

  // Head
  const headGeometry = new THREE.SphereGeometry(0.6, 32, 32);
  const head = new THREE.Mesh(headGeometry, bodyMaterial);
  head.position.set(0, 1, 0);
  cat.add(head);

  // Ears
  const earGeometry = new THREE.ConeGeometry(0.2, 0.4, 4);
  const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
  leftEar.position.set(-0.3, 1.5, 0);
  cat.add(leftEar);
  
  const rightEar = new THREE.Mesh(earGeometry, bodyMaterial);
  rightEar.position.set(0.3, 1.5, 0);
  cat.add(rightEar);

  // Eyes
  const eyeGeometry = new THREE.SphereGeometry(0.12, 16, 16);
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
  
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.2, 1.1, 0.5);
  cat.add(leftEye);
  
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.2, 1.1, 0.5);
  cat.add(rightEye);

  // Nose
  const noseGeometry = new THREE.SphereGeometry(0.08, 16, 16);
  const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xEC4899 });
  const nose = new THREE.Mesh(noseGeometry, noseMaterial);
  nose.position.set(0, 0.9, 0.55);
  cat.add(nose);

  // Whiskers
  const whiskerMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
  for (let i = -1; i <= 1; i += 2) {
    const whiskerGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(i * 0.3, 0.9, 0.5),
      new THREE.Vector3(i * 0.7, 0.95, 0.6)
    ]);
    const whisker = new THREE.Line(whiskerGeometry, whiskerMaterial);
    cat.add(whisker);
  }

  // Tail
  const tailCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, -0.8),
    new THREE.Vector3(0.5, 0.5, -1.2),
    new THREE.Vector3(0.3, 1, -1.5)
  );
  const tailGeometry = new THREE.TubeGeometry(tailCurve, 20, 0.15, 8, false);
  const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
  cat.add(tail);

  return cat;
}

// Dog companion
function createDog() {
  const dog = new THREE.Group();

  // Body
  const bodyGeometry = new THREE.SphereGeometry(0.9, 32, 32);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x92400E,
    roughness: 0.8,
    metalness: 0.1
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.scale.set(1.2, 0.9, 1);
  dog.add(body);

  // Head
  const headGeometry = new THREE.SphereGeometry(0.65, 32, 32);
  const head = new THREE.Mesh(headGeometry, bodyMaterial);
  head.position.set(0, 0.9, 0.3);
  head.scale.set(1, 0.9, 1.1);
  dog.add(head);

  // Snout
  const snoutGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.5, 16);
  const snout = new THREE.Mesh(snoutGeometry, bodyMaterial);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.7, 0.8);
  dog.add(snout);

  // Ears
  const earGeometry = new THREE.SphereGeometry(0.3, 16, 16);
  const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
  leftEar.position.set(-0.4, 1.2, 0.2);
  leftEar.scale.set(0.6, 1.2, 0.5);
  leftEar.rotation.z = -0.3;
  dog.add(leftEar);
  
  const rightEar = new THREE.Mesh(earGeometry, bodyMaterial);
  rightEar.position.set(0.4, 1.2, 0.2);
  rightEar.scale.set(0.6, 1.2, 0.5);
  rightEar.rotation.z = 0.3;
  dog.add(rightEar);

  // Eyes
  const eyeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
  
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.25, 1.1, 0.6);
  dog.add(leftEye);
  
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.25, 1.1, 0.6);
  dog.add(rightEye);

  // Nose
  const noseGeometry = new THREE.SphereGeometry(0.12, 16, 16);
  const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
  const nose = new THREE.Mesh(noseGeometry, noseMaterial);
  nose.position.set(0, 0.7, 1.05);
  dog.add(nose);

  // Tail
  const tailCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0.3, -0.9),
    new THREE.Vector3(0, 0.8, -1.2),
    new THREE.Vector3(0, 1.2, -1)
  );
  const tailGeometry = new THREE.TubeGeometry(tailCurve, 20, 0.18, 8, false);
  const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
  dog.add(tail);

  return dog;
}

// Orb companion
function createOrb() {
  const orb = new THREE.Group();

  // Main orb with iridescent material
  const orbGeometry = new THREE.SphereGeometry(1, 64, 64);
  const orbMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8B5CF6,
    metalness: 0.8,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });
  const mainOrb = new THREE.Mesh(orbGeometry, orbMaterial);
  orb.add(mainOrb);

  // Inner glow
  const glowGeometry = new THREE.SphereGeometry(0.7, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x14B8A6,
    transparent: true,
    opacity: 0.3
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  orb.add(glow);

  // Particle ring
  const particleCount = 50;
  const particlesGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const radius = 1.3;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle * 2) * 0.2;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particlesMaterial = new THREE.PointsMaterial({
    color: 0xFBBF24,
    size: 0.08,
    transparent: true,
    opacity: 0.8
  });
  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  orb.add(particles);

  // Add rotation animation to particles
  orb.userData.animate = (time) => {
    particles.rotation.y = time * 0.5;
    glow.rotation.x = time * 0.3;
  };

  return orb;
}

// Robot companion
function createRobot() {
  const robot = new THREE.Group();

  // Body (cube)
  const bodyGeometry = new THREE.BoxGeometry(1, 1.2, 0.8);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x6366F1,
    metalness: 0.7,
    roughness: 0.3
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  robot.add(body);

  // Head
  const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  const head = new THREE.Mesh(headGeometry, bodyMaterial);
  head.position.set(0, 1, 0);
  robot.add(head);

  // Antenna
  const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
  const antennaMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xFBBF24,
    metalness: 0.9,
    roughness: 0.1
  });
  const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
  antenna.position.set(0, 1.65, 0);
  robot.add(antenna);

  // Antenna ball
  const ballGeometry = new THREE.SphereGeometry(0.12, 16, 16);
  const ball = new THREE.Mesh(ballGeometry, antennaMaterial);
  ball.position.set(0, 1.95, 0);
  robot.add(ball);

  // Eyes
  const eyeGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
  const eyeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x14B8A6,
    emissive: 0x14B8A6,
    emissiveIntensity: 0.5
  });
  
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.25, 1.1, 0.45);
  robot.add(leftEye);
  
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.25, 1.1, 0.45);
  robot.add(rightEye);

  // Mouth display
  const mouthGeometry = new THREE.BoxGeometry(0.5, 0.15, 0.05);
  const mouthMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x000000,
    emissive: 0x8B5CF6,
    emissiveIntensity: 0.3
  });
  const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
  mouth.position.set(0, 0.8, 0.45);
  robot.add(mouth);

  // Arms
  const armGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8);
  const armMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x4F46E5,
    metalness: 0.6,
    roughness: 0.4
  });
  
  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.65, 0, 0);
  leftArm.rotation.z = 0.3;
  robot.add(leftArm);
  
  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.65, 0, 0);
  rightArm.rotation.z = -0.3;
  robot.add(rightArm);

  // Hands
  const handGeometry = new THREE.SphereGeometry(0.15, 16, 16);
  const leftHand = new THREE.Mesh(handGeometry, armMaterial);
  leftHand.position.set(-0.8, -0.5, 0);
  robot.add(leftHand);
  
  const rightHand = new THREE.Mesh(handGeometry, armMaterial);
  rightHand.position.set(0.8, -0.5, 0);
  robot.add(rightHand);

  // Chest panel
  const panelGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.05);
  const panelMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1E293B,
    metalness: 0.8,
    roughness: 0.2
  });
  const panel = new THREE.Mesh(panelGeometry, panelMaterial);
  panel.position.set(0, 0.2, 0.45);
  robot.add(panel);

  return robot;
}