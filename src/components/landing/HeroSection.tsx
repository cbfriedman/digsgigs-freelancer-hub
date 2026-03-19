export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden min-h-[70vh]">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/videos/hero-gigger-digger-connect.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
      />
    </section>
  );
};
