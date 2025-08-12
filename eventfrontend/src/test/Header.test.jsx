import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Header from '../component/header';

// Mock AuthTokenService
vi.mock('../services/AuthTokenService', () => ({
  default: {
    getToken: () => null,
    getUser: () => null,
    removeToken: () => {},
  },
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Header Component', () => {
  it('renders header component', () => {
    renderWithRouter(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('shows navigation links', () => {
    renderWithRouter(<Header />);
    // Add more specific tests based on your header structure
  });
});
