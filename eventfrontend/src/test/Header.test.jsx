import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Header from '../component/header';

// Mock AuthTokenService
vi.mock('../services/AuthTokenService', () => ({
  default: {
    getToken: () => null,
    getUser: () => null,
    removeToken: () => {},
    isAuthenticated: () => false,
    getUserRole: () => null,
    getDashboardRoute: () => '/dashboard',
    setAuthData: () => {},
    clearAuth: () => {},
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
