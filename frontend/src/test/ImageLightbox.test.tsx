import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImageLightbox, type LightboxPhoto } from "../components/ImageLightbox";

const photos: LightboxPhoto[] = [
  { url: "/a.jpg", alt: "A" },
  { url: "/b.jpg", alt: "B" },
  { url: "/c.jpg", alt: "C" },
];

function swipe(el: Element, fromX: number, toX: number, y = 0) {
  fireEvent.touchStart(el, { touches: [{ clientX: fromX, clientY: y }] });
  fireEvent.touchEnd(el, { changedTouches: [{ clientX: toX, clientY: y }] });
}

describe("ImageLightbox swipe", () => {
  it("swiping left advances to the next photo", () => {
    const onNavigate = vi.fn();
    render(<ImageLightbox photos={photos} index={0} onClose={vi.fn()} onNavigate={onNavigate} />);
    swipe(screen.getByRole("img"), 200, 120);
    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it("swiping right goes to the previous photo", () => {
    const onNavigate = vi.fn();
    render(<ImageLightbox photos={photos} index={1} onClose={vi.fn()} onNavigate={onNavigate} />);
    swipe(screen.getByRole("img"), 120, 240);
    expect(onNavigate).toHaveBeenCalledWith(0);
  });

  it("ignores a short drag and a mostly-vertical swipe", () => {
    const onNavigate = vi.fn();
    render(<ImageLightbox photos={photos} index={1} onClose={vi.fn()} onNavigate={onNavigate} />);
    const img = screen.getByRole("img");
    swipe(img, 200, 180); // too short
    fireEvent.touchStart(img, { touches: [{ clientX: 200, clientY: 0 }] });
    fireEvent.touchEnd(img, { changedTouches: [{ clientX: 120, clientY: 200 }] }); // vertical wins
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("does not wrap past the last photo", () => {
    const onNavigate = vi.fn();
    render(<ImageLightbox photos={photos} index={2} onClose={vi.fn()} onNavigate={onNavigate} />);
    swipe(screen.getByRole("img"), 200, 120);
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
