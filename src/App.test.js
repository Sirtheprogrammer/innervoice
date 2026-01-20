import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';

const AppWithRouter = () => (
  <Router>
    <App />
  </Router>
);

test('renders main heading', () => {
  render(<AppWithRouter />);
  const heading = screen.getByRole('heading', { name: /UPDATES/i });
  expect(heading).toBeInTheDocument();
});

test('hamburger toggles sidebar open/close', () => {
  render(<AppWithRouter />);
  const toggle = screen.getByLabelText(/Toggle navigation/i);
  const sidebar = screen.getByLabelText(/Side navigation/i);

  // initially closed
  expect(sidebar.classList.contains('open')).toBe(false);

  fireEvent.click(toggle);
  expect(sidebar.classList.contains('open')).toBe(true);

  fireEvent.click(toggle);
  expect(sidebar.classList.contains('open')).toBe(false);
});
