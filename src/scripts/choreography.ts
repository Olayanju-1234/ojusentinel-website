/*
  GSAP + ScrollTrigger choreography — the enhancement layer, dynamically imported
  after idle and never under reduced-motion. The base experience (reveals, eye
  dock, case file) already works without this; GSAP only adds the flourish:
  at most three parallax layers (transform-only, decorative elements only, so no
  CLS) and a brass sweep across section headers as they enter.
*/
export async function initChoreography(): Promise<void> {
  const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  // Parallax — decorative layers only, capped at three.
  gsap.utils
    .toArray<HTMLElement>('[data-parallax]')
    .slice(0, 3)
    .forEach((el) => {
      const speed = parseFloat(el.dataset.parallax ?? '0.15');
      gsap.fromTo(
        el,
        { yPercent: -speed * 50 },
        {
          yPercent: speed * 50,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
        },
      );
    });

  // Sweep — a brass line wipes across each section header once, on enter.
  gsap.utils.toArray<HTMLElement>('[data-sweep]').forEach((el) => {
    gsap.fromTo(
      el,
      { '--sweep': '0%' } as gsap.TweenVars,
      {
        '--sweep': '100%',
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 82%', once: true },
      } as gsap.TweenVars,
    );
  });

  ScrollTrigger.refresh();
}
