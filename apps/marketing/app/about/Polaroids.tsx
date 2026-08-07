// Three tacked-up Polaroids — deliberately uneven rotations, offsets and tape
// so the wall feels organic, not scripted. Hovering straightens the one you're
// looking at. Captions play on the "who actually owns her" bit up top.
const PHOTOS = [
  {
    src: "/about/olive-1.webp",
    alt: "Olive, a chocolate cocker spaniel, refusing to leave the bed",
    caption: "The 2am negotiator",
    tilt: "-rotate-6",
    lift: "sm:mt-2",
    tape: "rotate-3",
  },
  {
    src: "/about/olive-2.webp",
    alt: "One of Olive's owners hugging her on the grass at sunset",
    caption: "Owner #1, allegedly",
    tilt: "rotate-3",
    lift: "sm:mt-10",
    tape: "-rotate-6",
  },
  {
    src: "/about/olive-3.webp",
    alt: "Another of Olive's owners holding her at a beer garden",
    caption: "Owner #2, allegedly",
    tilt: "-rotate-2",
    lift: "sm:mt-4",
    tape: "rotate-6",
  },
];

export default function Polaroids() {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-16 pt-2 sm:pb-24">
      <div className="flex flex-wrap items-start justify-center gap-8 sm:gap-2">
        {PHOTOS.map((p, i) => (
          <figure
            key={p.src}
            className={`group relative w-[210px] shrink-0 bg-white p-2.5 pb-8 shadow-[0_12px_30px_rgba(81,0,0,0.20)] transition-transform duration-300 hover:z-10 hover:rotate-0 hover:scale-[1.04] ${p.tilt} ${p.lift} ${
              i > 0 ? "sm:-ml-5" : ""
            }`}
          >
            {/* strip of "tape" holding it up */}
            <span
              aria-hidden
              className={`absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 bg-[#E5BEC4]/70 shadow-sm ${p.tape}`}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.src}
              alt={p.alt}
              width={720}
              height={960}
              loading="lazy"
              className="block aspect-[3/4] w-full object-cover"
            />
            <figcaption className="mt-2.5 text-center text-sm text-[#6b4a54]">{p.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
