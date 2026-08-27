"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
	{
		image:
			"https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=2000&q=85",
		eyebrow: "Brotherhood · Service · Excellence",
		title: "Rooted in brotherhood.",
		description:
			"A lasting fellowship of leaders committed to making a meaningful difference in Roxas City and beyond.",
	},
	{
		image:
			"https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=2000&q=85",
		eyebrow: "Community Service",
		title: "Hands ready to serve.",
		description:
			"From outreach programs to neighborhood initiatives, we turn shared purpose into visible action.",
	},
	{
		image:
			"https://images.unsplash.com/photo-1504150558240-0b4fd8946624?auto=format&fit=crop&w=2000&q=85",
		eyebrow: "A Chapter with History",
		title: "More than five decades strong.",
		description:
			"Since 1973, the Roxas City Capiz Chapter has carried its values forward through every generation.",
	},
	{
		image:
			"https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=2000&q=85",
		eyebrow: "A Fellowship for Life",
		title: "Many paths. One bond.",
		description:
			"We build friendships that last, sharpen one another through challenge, and celebrate every milestone together.",
	},
	{
		image:
			"https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&w=2000&q=85",
		eyebrow: "PGPGS Roxas City",
		title: "Your place to belong.",
		description:
			"Discover a community shaped by character, service, and the courage to lead with purpose.",
	},
];

export default function HeroSlider() {
	const [activeSlide, setActiveSlide] = useState(0);

	useEffect(() => {
		const timer = window.setInterval(() => {
			setActiveSlide((current) => (current + 1) % slides.length);
		}, 6000);

		return () => window.clearInterval(timer);
	}, []);

	const goToSlide = (index: number) => setActiveSlide(index);
	const goToPrevious = () =>
		setActiveSlide((current) => (current - 1 + slides.length) % slides.length);
	const goToNext = () =>
		setActiveSlide((current) => (current + 1) % slides.length);

	return (
		<section className="relative isolate min-h-[calc(100svh-5.75rem)] overflow-hidden bg-[var(--green-dark)] text-white sm:min-h-[680px]" aria-label="PGPGS highlights">
			{slides.map((slide, index) => (
				<div
					key={slide.title}
					className={`absolute inset-0 transition-opacity duration-1000 ${index === activeSlide ? "opacity-100" : "pointer-events-none opacity-0"}`}
					aria-hidden={index !== activeSlide}
				>
					<Image
						src={slide.image}
						alt=""
						fill
						priority={index === 0}
						sizes="100vw"
						className="object-cover"
					/>
					<div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,61,38,0.94)_0%,rgba(15,61,38,0.7)_43%,rgba(15,61,38,0.12)_100%)]" />
				</div>
			))}

			<div className="relative mx-auto flex min-h-[calc(100svh-5.75rem)] max-w-[1440px] items-end px-6 pb-16 pt-6 sm:min-h-[680px] sm:px-10 sm:pb-20 sm:pt-10 lg:px-16">
				<div className="max-w-2xl">
					<p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-light)]">
						{slides[activeSlide].eyebrow}
					</p>
					<h1 className="max-w-xl font-serif text-5xl font-semibold leading-[0.98] sm:text-7xl lg:text-8xl">
						{slides[activeSlide].title}
					</h1>
					<p className="mt-3 max-w-lg text-base leading-7 text-white/80 sm:text-lg">
						{slides[activeSlide].description}
					</p>
				</div>
			</div>

			<div className="absolute inset-x-6 bottom-7 flex items-center justify-between sm:inset-x-10 lg:inset-x-16">
				<div className="flex items-center gap-2" role="tablist" aria-label="Choose a slide">
					{slides.map((slide, index) => (
						<button
							key={slide.title}
							type="button"
							role="tab"
							aria-selected={index === activeSlide}
							aria-label={`Show slide ${index + 1}: ${slide.title}`}
							onClick={() => goToSlide(index)}
							className={`h-1.5 transition-all ${index === activeSlide ? "w-12 bg-[var(--gold)]" : "w-6 bg-white/45 hover:bg-white/80"}`}
						/>
					))}
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						aria-label="Previous slide"
						onClick={goToPrevious}
						className="flex h-11 w-11 items-center justify-center border border-white/35 text-xl transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
					>
						<span aria-hidden="true">←</span>
					</button>
					<button
						type="button"
						aria-label="Next slide"
						onClick={goToNext}
						className="flex h-11 w-11 items-center justify-center border border-white/35 text-xl transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
					>
						<span aria-hidden="true">→</span>
					</button>
				</div>
			</div>
		</section>
	);
}
