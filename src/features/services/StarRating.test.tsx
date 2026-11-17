import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import StarRating from './StarRating'

function Controlled({ onChange }: { onChange: (value: number) => void }) {
  const [value, setValue] = useState(0)
  return <StarRating value={value} onChange={(next) => { setValue(next); onChange(next) }} />
}

describe('StarRating', () => {
  it('picks a rating with one tap and names it', async () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)

    await userEvent.click(screen.getByLabelText('4 of 5 stars, Very good'))

    expect(onChange).toHaveBeenLastCalledWith(4)
    expect(screen.getByLabelText('4 of 5 stars, Very good')).toBeChecked()
    expect(screen.getByText('Very good')).toBeInTheDocument()
  })

  it('previews on hover, and a keyboard change wins over a resting mouse', async () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    const star = (label: string) => screen.getByLabelText(label) as HTMLInputElement

    await userEvent.hover(star('5 of 5 stars, Excellent').labels![0])
    expect(screen.getByText('Excellent')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()

    // The mouse stays on star 5 while the customer uses the arrow keys.
    star('2 of 5 stars, Fair').focus()
    await userEvent.keyboard('{ArrowRight}')

    expect(onChange).toHaveBeenLastCalledWith(3)
    // The bug this guards: the word and stars stayed on the hover preview after a keyboard change.
    expect(screen.getByText('Good')).toBeInTheDocument()
  })
})
