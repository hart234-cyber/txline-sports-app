"use client";

export function triggerConfetti() {
  const canvas = document.getElementById("confetti-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d")!;
  const particles: any[] = [];
  const colors = ["#00ff88", "#00f0ff", "#d4af37", "#ff2255", "#ffffff"];

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height - 20,
      r: 3 + Math.random() * 4,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.06 + 0.02,
      tiltAngle: 0,
    });
  }

  let active = true;
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    active = false;
    particles.forEach((p) => {
      p.y += (Math.cos(p.d) + 3.5 + p.r / 2) / 2;
      p.tiltAngle += p.tiltAngleIncremental;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 12;

      ctx.beginPath();
      ctx.lineWidth = p.r * 1.8;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();

      if (p.y < canvas.height) active = true;
    });
    if (active) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  draw();
}
