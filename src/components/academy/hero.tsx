import { getTranslations } from "next-intl/server";

/**
 * Hero — pixel values from tokens.json:
 *   h1: 72px / 700 / lh 64.8px / tracking -3.6px / color hsl(var(--foreground))
 *   p : 22.4px / 400 / lh 36.4px / tracking 0.6px / color hsl(var(--muted-foreground))
 *
 * Layout: title+subtitle on the left, robot illustration on the right (centered on hero block).
 * The site header is now sticky (72px) and sits in normal flow above this section,
 * so no margin-top is needed.
 */
export async function Hero() {
  const t = await getTranslations("site");

  return (
    <section
      className="relative flex w-full flex-col justify-end overflow-hidden px-6 pt-10 pb-8"
      style={{
        backgroundColor: "hsl(var(--background))",
      }}
    >
      {/* Subtle gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(0deg, rgba(0,0,0,0.02), rgba(0,0,0,0))",
        }}
      />

      {/* Ambient pulsing glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          backgroundColor: "hsl(var(--card))",
          borderRadius: 9999,
          filter: "blur(120px)",
          height: 600,
          width: 600,
          left: 0,
          top: "50%",
          transform: "translateY(-300px)",
          animation: "var(--animate-pulse-slow)",
        }}
      />

      <div className="relative z-10 mx-auto w-full" style={{ maxWidth: 1280 }}>
        <div
          className="mx-auto flex w-full flex-col items-center justify-between gap-8 lg:flex-row"
          style={{ maxWidth: 980 }}
        >
          {/* Left: title + subtitle */}
          <div className="relative z-20 flex flex-col gap-6 text-left">
            <div
              className="pointer-events-none absolute"
              style={{
                backgroundColor: "rgba(16,185,129,0.05)",
                borderRadius: 9999,
                filter: "blur(80px)",
                height: 160,
                width: 160,
                left: -80,
                top: -80,
              }}
            />

            <h1
              className="relative uppercase"
              style={{
                fontSize: "clamp(40px, 11vw, 72px)",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.05em",
                color: "hsl(var(--foreground))",
                marginBottom: 16,
                animation: "var(--animate-fade-in-up)",
                opacity: 0,
              }}
            >
              <span
                className="inline-block bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, hsl(var(--foreground)), hsl(var(--muted-foreground)), hsl(var(--foreground)))",
                  backgroundSize: "200%",
                  animation: "var(--animate-text-shine)",
                  WebkitBackgroundClip: "text",
                }}
              >
                {t("title")}
              </span>
            </h1>

            <p
              style={{
                fontSize: "clamp(16px, 4vw, 22.4px)",
                lineHeight: 1.5,
                letterSpacing: "0.6px",
                color: "hsl(var(--muted-foreground))",
                marginBottom: 32,
                animation: "var(--animate-fade-in-up)",
                animationDelay: "0.1s",
                opacity: 0,
              }}
            >
              {t("tagline")}
            </p>
          </div>

          {/* Right: animated robot illustration — mirrors the live
              kiyotaka.ai SVG (book floats, eyes blink, antenna pulses,
              scan beam fades, "1/0/1" particles rise out of the book). */}
          <div
            className="relative z-10 flex h-[240px] w-[240px] items-center justify-center md:h-[300px] md:w-[300px] lg:h-[320px] lg:w-[320px]"
            style={{
              pointerEvents: "none",
              animation: "var(--animate-fade-in)",
              opacity: 0,
              color: "hsl(var(--foreground))",
            }}
            aria-hidden="true"
          >
            <RobotIllustration />
          </div>
        </div>
      </div>
    </section>
  );
}

function RobotIllustration() {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="robot-learning-svg"
    >
      <defs>
        <radialGradient
          id="robotGlow"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(200 200) rotate(90) scale(150)"
        >
          <stop className="robot-glow-stop" stopOpacity="0.08" stopColor="currentColor" />
          <stop offset="1" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="robotBody" x1="0" y1="0" x2="1" y2="1">
          <stop className="robot-body-stop-1" stopColor="currentColor" />
          <stop className="robot-body-stop-2" stopColor="currentColor" offset="1" />
        </linearGradient>
      </defs>

      <circle
        cx="200"
        cy="200"
        r="180"
        fill="url(#robotGlow)"
        className="robot-glow-circle"
      />

      {/* Floating book */}
      <g className="robot-book-group">
        <ellipse cx="200" cy="310" rx="55" ry="10" className="robot-book-shadow" />
        <path d="M140 280 L260 280 L250 260 L150 260 Z" className="robot-book-cover" />
        <path
          d="M150 260 C150 260 175 270 200 270 C225 270 250 260 250 260 V250 C250 250 225 260 200 260 C175 260 150 250 150 250 Z"
          className="robot-book-pages"
        />
        <rect x="140" y="278" width="120" height="5" rx="2" className="robot-book-spine" />
        <line x1="160" y1="255" x2="190" y2="258" className="robot-book-line" />
        <line x1="160" y1="260" x2="195" y2="263" className="robot-book-line" />
        <line x1="210" y1="263" x2="240" y2="260" className="robot-book-line" />
      </g>

      {/* Robot (shifted up so it sits above the book) */}
      <g transform="translate(0, -20)">
        <rect x="190" y="230" width="20" height="30" className="robot-neck" />
        <rect
          x="160"
          y="150"
          width="80"
          height="80"
          rx="16"
          fill="url(#robotBody)"
          className="robot-body"
        />
        <rect x="155" y="180" width="5" height="20" rx="2" className="robot-arm-left" />
        <rect x="240" y="180" width="5" height="20" rx="2" className="robot-arm-right" />
        <rect x="170" y="170" width="60" height="40" rx="4" className="robot-screen" />
        <g className="robot-eyes">
          <circle cx="185" cy="190" r="3" className="robot-eye" />
          <circle cx="215" cy="190" r="3" className="robot-eye" />
        </g>
        <path d="M200 150 V130" className="robot-antenna" />
        <circle cx="200" cy="130" r="2" className="robot-antenna-tip" />
      </g>

      {/* Scan beam from eyes down to the book */}
      <path
        d="M185 190 L140 260 L260 260 L215 190 Z"
        className="robot-scan-beam"
      />

      {/* "Knowledge" particles rising out of the book */}
      <g>
        <text x="175" y="240" className="robot-particle" style={{ animationDelay: "0s" }}>
          1
        </text>
        <text x="215" y="235" className="robot-particle" style={{ animationDelay: "1.2s" }}>
          0
        </text>
        <text x="195" y="220" className="robot-particle" style={{ animationDelay: "2.5s" }}>
          1
        </text>
      </g>
    </svg>
  );
}
