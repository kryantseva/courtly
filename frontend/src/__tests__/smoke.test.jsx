import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
describe("smoke", () => {
  it("renders landing page", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
