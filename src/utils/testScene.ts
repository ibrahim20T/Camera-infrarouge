/**
 * Generates dynamic animated test scenes to feed into the Canvas
 * for previewing and testing IR filters without needing a physical camera.
 */

export function renderSimulationScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number
): void {
  const t = timeMs * 0.001;

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.6);
  skyGrad.addColorStop(0, '#1a365d'); // deep blue sky
  skyGrad.addColorStop(0.6, '#4299e1');
  skyGrad.addColorStop(1, '#bee3f8');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height * 0.6);

  // Distant mountains / terrain
  ctx.fillStyle = '#2d3748';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.6);
  ctx.lineTo(width * 0.25, height * 0.45);
  ctx.lineTo(width * 0.5, height * 0.55);
  ctx.lineTo(width * 0.75, height * 0.42);
  ctx.lineTo(width, height * 0.58);
  ctx.lineTo(width, height * 0.6);
  ctx.closePath();
  ctx.fill();

  // Ground / Meadow (rich chlorophyll green to showcase Wood effect IR & Night Vision)
  const groundGrad = ctx.createLinearGradient(0, height * 0.55, 0, height);
  groundGrad.addColorStop(0, '#2f855a');
  groundGrad.addColorStop(0.5, '#38a169');
  groundGrad.addColorStop(1, '#276749');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, height * 0.55, width, height * 0.45);

  // Moving simulated foliage / trees (swaying gently)
  const treeCount = 4;
  for (let i = 0; i < treeCount; i++) {
    const treeX = width * (0.15 + i * 0.24) + Math.sin(t + i) * 8;
    const treeBaseY = height * 0.75;
    const treeHeight = height * 0.35;

    // Trunk
    ctx.fillStyle = '#744210';
    ctx.fillRect(treeX - 8, treeBaseY - treeHeight * 0.4, 16, treeHeight * 0.4);

    // Leaves / foliage (chlorophyll rich: R: 34, G: 197, B: 94)
    ctx.fillStyle = i % 2 === 0 ? '#22c55e' : '#16a34a';
    ctx.beginPath();
    ctx.arc(treeX, treeBaseY - treeHeight * 0.6, treeHeight * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(treeX - 12, treeBaseY - treeHeight * 0.7, treeHeight * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Moving target object (e.g. warm body / vehicle passing by to showcase thermal & IR detection)
  const carX = ((t * 80) % (width + 200)) - 100;
  const carY = height * 0.82;

  // Vehicle body
  ctx.fillStyle = '#e53e3e'; // warm red
  ctx.fillRect(carX, carY, 110, 32);
  ctx.fillStyle = '#cbd5e0';
  ctx.fillRect(carX + 20, carY - 20, 60, 22);

  // Wheels
  ctx.fillStyle = '#1a202c';
  ctx.beginPath();
  ctx.arc(carX + 25, carY + 32, 14, 0, Math.PI * 2);
  ctx.arc(carX + 85, carY + 32, 14, 0, Math.PI * 2);
  ctx.fill();

  // Headlights
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(carX + 110, carY + 14, 6, 0, Math.PI * 2);
  ctx.fill();

  // Standing thermal human figure
  const personX = width * 0.82;
  const personY = height * 0.76;
  // Head
  ctx.fillStyle = '#fc8181'; // body heat
  ctx.beginPath();
  ctx.arc(personX, personY - 48, 10, 0, Math.PI * 2);
  ctx.fill();
  // Torso
  ctx.fillStyle = '#f56565';
  ctx.fillRect(personX - 8, personY - 38, 16, 28);
  // Legs
  ctx.fillStyle = '#e53e3e';
  ctx.fillRect(personX - 7, personY - 10, 5, 22);
  ctx.fillRect(personX + 2, personY - 10, 5, 22);

  // On-screen timecode & scene watermark for simulation realism
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText('SIMULATION SCENE // TEST FLUX', 16, 26);
}
