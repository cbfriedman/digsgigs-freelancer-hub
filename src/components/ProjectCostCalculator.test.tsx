import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import ProjectCostCalculator from './ProjectCostCalculator';

/**
 * Rebate feature is DEPRECATED - calculateFreeEstimateRebate always returns zeros.
 * These tests verify the calculator renders and the deprecated rebate UI still appears
 * (rules alert when checked) but no rebate amounts are applied.
 */
describe('ProjectCostCalculator Integration Tests', () => {
  it('renders the cost calculator', () => {
    render(<ProjectCostCalculator />);
    expect(screen.getByText(/Interactive Cost Calculator/i)).toBeInTheDocument();
    expect(screen.getByText('Fixed-Price Contract')).toBeInTheDocument();
    expect(screen.getAllByText(/Hourly Rate Project/i).length).toBeGreaterThan(0);
  });

  it('shows rebate rules alert when free estimate checkbox is checked', () => {
    render(<ProjectCostCalculator />);
    const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
    fireEvent.click(checkbox);
    expect(screen.getByText(/Free Estimate Rebate Rules/i)).toBeInTheDocument();
  });

  it('hides rebate alert when free estimate checkbox is unchecked', () => {
    render(<ProjectCostCalculator />);
    const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
    fireEvent.click(checkbox);
    expect(screen.getByText(/Free Estimate Rebate Rules/i)).toBeInTheDocument();
    fireEvent.click(checkbox);
    expect(screen.queryByText(/Free Estimate Rebate Rules/i)).not.toBeInTheDocument();
  });

  it('displays free estimate cost as $0 in checkbox label (feature deprecated)', () => {
    render(<ProjectCostCalculator />);
    const checkbox = screen.getByLabelText(/Previously paid for Free Estimate \(\$0\)/i);
    expect(checkbox).toBeInTheDocument();
  });
});
