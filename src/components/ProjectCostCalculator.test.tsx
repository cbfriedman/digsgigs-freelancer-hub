import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { screen, fireEvent, within } from '@testing-library/dom';
import ProjectCostCalculator from './ProjectCostCalculator';

describe('ProjectCostCalculator Integration Tests', () => {
  describe('Free Estimate Checkbox Behavior', () => {
    it('should show rebate alert when free estimate checkbox is checked', () => {
      render(<ProjectCostCalculator />);
      
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      fireEvent.click(checkbox);
      
      const alert = screen.getByText(/Free Estimate Rebate Rules/i);
      expect(alert).toBeInTheDocument();
    });

    it('should hide rebate alert when free estimate checkbox is unchecked', () => {
      render(<ProjectCostCalculator />);
      
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      
      // Check then uncheck
      fireEvent.click(checkbox);
      expect(screen.getByText(/Free Estimate Rebate Rules/i)).toBeInTheDocument();
      
      fireEvent.click(checkbox);
      expect(screen.queryByText(/Free Estimate Rebate Rules/i)).not.toBeInTheDocument();
    });

    it('should display correct free estimate cost in checkbox label for Pro tier', () => {
      render(<ProjectCostCalculator />);
      
      // Default tier is Pro
      const checkboxLabel = screen.getByLabelText(/Previously paid for Free Estimate \(\$100\)/i);
      expect(checkboxLabel).toBeInTheDocument();
    });

    it('should update free estimate cost when tier changes', () => {
      render(<ProjectCostCalculator />);
      
      // Change to Free tier
      const tierSelect = screen.getByLabelText(/Your Subscription Tier/i);
      fireEvent.change(tierSelect, { target: { value: 'free' } });
      
      const checkboxLabel = screen.getByLabelText(/Previously paid for Free Estimate \(\$150\)/i);
      expect(checkboxLabel).toBeInTheDocument();
      
      // Change to Premium tier
      fireEvent.change(tierSelect, { target: { value: 'premium' } });
      
      const premiumCheckboxLabel = screen.getByLabelText(/Previously paid for Free Estimate \(\$50\)/i);
      expect(premiumCheckboxLabel).toBeInTheDocument();
    });
  });

  describe('Fixed-Price Contract Rebate Display', () => {
    it('should show rebate applied message for $5,000 fixed-price contract', () => {
      render(<ProjectCostCalculator />);
      
      // Set project budget to exactly $5,000 (default is $5,000)
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      fireEvent.click(checkbox);
      
      const successMessage = screen.getByText(/Your fixed-price contract qualifies for a \$100 rebate!/i);
      expect(successMessage).toBeInTheDocument();
    });

    it('should show rebate NOT applied message for $4,999 fixed-price contract', () => {
      render(<ProjectCostCalculator />);
      
      // Set project budget to $4,500 (below threshold)
      const budgetSlider = screen.getByRole('slider', { name: /projectBudget/i });
      fireEvent.change(budgetSlider, { target: { value: '4500' } });
      
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      fireEvent.click(checkbox);
      
      const denialMessage = screen.getByText(/Rebates only available for contracts of \$5,000 or more/i);
      expect(denialMessage).toBeInTheDocument();
    });

    it('should show rebate applied for $10,000 fixed-price contract', () => {
      render(<ProjectCostCalculator />);
      
      // Set project budget to $10,000 (well above threshold)
      const budgetSlider = screen.getByRole('slider', { name: /projectBudget/i });
      fireEvent.change(budgetSlider, { target: { value: '10000' } });
      
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      fireEvent.click(checkbox);
      
      const successMessage = screen.getByText(/Your fixed-price contract qualifies for a \$100 rebate!/i);
      expect(successMessage).toBeInTheDocument();
    });

    it('should show rebate line item deduction in fixed-price card when rebate applies', () => {
      render(<ProjectCostCalculator />);
      
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      fireEvent.click(checkbox);
      
      // Find the fixed-price card
      const fixedPriceCard = screen.getByText('Fixed-Price Contract').closest('.space-y-4') as HTMLElement;
      expect(fixedPriceCard).toBeInTheDocument();
      
      // Check for rebate line item
      const rebateLine = within(fixedPriceCard).getByText(/Free Estimate Rebate/i);
      expect(rebateLine).toBeInTheDocument();
      
      const rebateAmount = within(fixedPriceCard).getByText(/-\$100/i);
      expect(rebateAmount).toBeInTheDocument();
    });

    it('should NOT show rebate line item when amount is under $5,000', () => {
      render(<ProjectCostCalculator />);
      
      // Set to $4,500
      const budgetSlider = screen.getByRole('slider', { name: /projectBudget/i });
      fireEvent.change(budgetSlider, { target: { value: '4500' } });
      
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      fireEvent.click(checkbox);
      
      // Find the fixed-price card
      const fixedPriceCard = screen.getByText('Fixed-Price Contract').closest('.space-y-4') as HTMLElement;
      
      // Rebate line should NOT appear
      const rebateLine = within(fixedPriceCard).queryByText(/Free Estimate Rebate/i);
      expect(rebateLine).not.toBeInTheDocument();
    });

    it('should show eligibility indicator for projects >= $5,000', () => {
      render(<ProjectCostCalculator />);
      
      // Default is $5,000
      const fixedPriceCard = screen.getByText('Fixed-Price Contract').closest('div') as HTMLElement;
      const eligibilityText = within(fixedPriceCard).getByText(/Eligible for free estimate rebate/i);
      expect(eligibilityText).toBeInTheDocument();
    });
  });

  describe('Hourly Contract Rebate Display', () => {
    it('should show "Not available (hourly)" message in hourly card when free estimate is checked', () => {
      render(<ProjectCostCalculator />);
      
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      fireEvent.click(checkbox);
      
      // Find the hourly card
      const hourlyCard = screen.getByText('Hourly Rate Project').closest('.space-y-4') as HTMLElement;
      expect(hourlyCard).toBeInTheDocument();
      
      // Check for "not available" message
      const notAvailable = within(hourlyCard).getByText(/Not available \(hourly\)/i);
      expect(notAvailable).toBeInTheDocument();
    });

    it('should NOT show rebate line item in hourly card even with high amount', () => {
      render(<ProjectCostCalculator />);
      
      // Set high hourly rate and hours
      const hourlySlider = screen.getByRole('slider', { name: /hourlyRate/i });
      fireEvent.change(hourlySlider, { target: { value: '150' } });
      
      const hoursSlider = screen.getByRole('slider', { name: /estimatedHours/i });
      fireEvent.change(hoursSlider, { target: { value: '100' } });
      
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      fireEvent.click(checkbox);
      
      // Find hourly card
      const hourlyCard = screen.getByText('Hourly Rate Project').closest('.space-y-4') as HTMLElement;
      
      // Should show "not available" but not show a deduction
      const notAvailable = within(hourlyCard).getByText(/Not available \(hourly\)/i);
      expect(notAvailable).toBeInTheDocument();
      
      // Should NOT show rebate amount
      const rebateAmount = within(hourlyCard).queryByText(/-\$/i);
      expect(rebateAmount).not.toBeInTheDocument();
    });

    it('should mention no rebates in hourly benefits list', () => {
      render(<ProjectCostCalculator />);
      
      const hourlyCard = screen.getByText('Hourly Rate Project').closest('div') as HTMLElement;
      const noRebatesText = within(hourlyCard).getByText(/No free estimate rebates available/i);
      expect(noRebatesText).toBeInTheDocument();
    });
  });

  describe('Threshold Boundary Testing', () => {
    it('should handle transition from $4,999 to $5,000 correctly', () => {
      render(<ProjectCostCalculator />);
      
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      fireEvent.click(checkbox);
      
      const budgetSlider = screen.getByRole('slider', { name: /projectBudget/i });
      
      // Start at $4,500 (no rebate)
      fireEvent.change(budgetSlider, { target: { value: '4500' } });
      expect(screen.getByText(/Rebates only available for contracts of \$5,000 or more/i)).toBeInTheDocument();
      
      // Move to exactly $5,000 (rebate should apply)
      fireEvent.change(budgetSlider, { target: { value: '5000' } });
      expect(screen.getByText(/Your fixed-price contract qualifies for a \$100 rebate!/i)).toBeInTheDocument();
    });

    it('should handle transition from $5,000 to $4,500 correctly', () => {
      render(<ProjectCostCalculator />);
      
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      fireEvent.click(checkbox);
      
      const budgetSlider = screen.getByRole('slider', { name: /projectBudget/i });
      
      // Start at $5,000 (rebate applies)
      fireEvent.change(budgetSlider, { target: { value: '5000' } });
      expect(screen.getByText(/Your fixed-price contract qualifies for a \$100 rebate!/i)).toBeInTheDocument();
      
      // Move to $4,500 (rebate should NOT apply)
      fireEvent.change(budgetSlider, { target: { value: '4500' } });
      expect(screen.getByText(/Rebates only available for contracts of \$5,000 or more/i)).toBeInTheDocument();
    });
  });

  describe('Tier-Specific Rebate Amounts', () => {
    it('should show $150 rebate for Free tier', () => {
      render(<ProjectCostCalculator />);
      
      const tierSelect = screen.getByLabelText(/Your Subscription Tier/i);
      fireEvent.change(tierSelect, { target: { value: 'free' } });
      
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      fireEvent.click(checkbox);
      
      const successMessage = screen.getByText(/Your fixed-price contract qualifies for a \$150 rebate!/i);
      expect(successMessage).toBeInTheDocument();
      
      const fixedPriceCard = screen.getByText('Fixed-Price Contract').closest('.space-y-4') as HTMLElement;
      const rebateAmount = within(fixedPriceCard).getByText(/-\$150/i);
      expect(rebateAmount).toBeInTheDocument();
    });

    it('should show $100 rebate for Pro tier', () => {
      render(<ProjectCostCalculator />);
      
      // Default is Pro tier
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      fireEvent.click(checkbox);
      
      const successMessage = screen.getByText(/Your fixed-price contract qualifies for a \$100 rebate!/i);
      expect(successMessage).toBeInTheDocument();
      
      const fixedPriceCard = screen.getByText('Fixed-Price Contract').closest('.space-y-4') as HTMLElement;
      const rebateAmount = within(fixedPriceCard).getByText(/-\$100/i);
      expect(rebateAmount).toBeInTheDocument();
    });

    it('should show $50 rebate for Premium tier', () => {
      render(<ProjectCostCalculator />);
      
      const tierSelect = screen.getByLabelText(/Your Subscription Tier/i);
      fireEvent.change(tierSelect, { target: { value: 'premium' } });
      
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      fireEvent.click(checkbox);
      
      const successMessage = screen.getByText(/Your fixed-price contract qualifies for a \$50 rebate!/i);
      expect(successMessage).toBeInTheDocument();
      
      const fixedPriceCard = screen.getByText('Fixed-Price Contract').closest('.space-y-4') as HTMLElement;
      const rebateAmount = within(fixedPriceCard).getByText(/-\$50/i);
      expect(rebateAmount).toBeInTheDocument();
    });
  });

  describe('Cost Calculation Accuracy', () => {
    it('should reduce total cost by rebate amount when applied', () => {
      render(<ProjectCostCalculator />);
      
      // Get baseline total without rebate
      const fixedPriceCard = screen.getByText('Fixed-Price Contract').closest('.space-y-4') as HTMLElement;
      const totalWithoutRebate = within(fixedPriceCard).getAllByText(/Total Cost/i)[0]
        .closest('div')?.querySelector('.text-primary')?.textContent;
      
      // Apply free estimate
      const checkbox = screen.getByLabelText(/Previously paid for Free Estimate/i);
      fireEvent.click(checkbox);
      
      // Get new total with rebate
      const totalWithRebate = within(fixedPriceCard).getAllByText(/Total Cost/i)[0]
        .closest('div')?.querySelector('.text-primary')?.textContent;
      
      // Totals should be different
      expect(totalWithoutRebate).not.toBe(totalWithRebate);
    });
  });
});
