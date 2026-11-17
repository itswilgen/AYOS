import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { savedProvidersService } from '../../services/home.service'
import SaveProviderButton from './SaveProviderButton'

vi.mock('../../services/home.service', () => ({ savedProvidersService: { save: vi.fn(), remove: vi.fn() } }))

describe('SaveProviderButton', () => {
  it('saves at once and tells the parent', async () => {
    vi.mocked(savedProvidersService.save).mockResolvedValue()
    const onChange = vi.fn()
    render(<SaveProviderButton providerId="9" providerName="Jun Reyes Plumbing" saved={false} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Save for later' }))

    expect(savedProvidersService.save).toHaveBeenCalledWith('9')
    expect(screen.getByRole('button', { name: 'Saved to your providers' })).toHaveAttribute('aria-pressed', 'true')
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('puts things back and explains when the server says no', async () => {
    vi.mocked(savedProvidersService.save).mockRejectedValue(new Error('You can save up to 50 providers.'))
    const onChange = vi.fn()
    render(<SaveProviderButton providerId="9" providerName="Jun Reyes Plumbing" saved={false} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Save for later' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('You can save up to 50 providers.')
    expect(screen.getByRole('button', { name: 'Save for later' })).toHaveAttribute('aria-pressed', 'false')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes a saved provider from the icon button, which has its own label', async () => {
    vi.mocked(savedProvidersService.remove).mockResolvedValue()
    render(<SaveProviderButton variant="icon" providerId="9" providerName="Jun Reyes Plumbing" saved />)

    await userEvent.click(screen.getByRole('button', { name: 'Remove Jun Reyes Plumbing from saved providers' }))

    expect(savedProvidersService.remove).toHaveBeenCalledWith('9')
    expect(screen.getByRole('button', { name: 'Save Jun Reyes Plumbing' })).toHaveAttribute('aria-pressed', 'false')
  })
})
