import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/test-utils'
import { Component } from 'react'
import ErrorBoundary from './ErrorBoundary'

// Test component that throws an error
class ThrowError extends Component<{ shouldThrow?: boolean }> {
  render() {
    if (this.props.shouldThrow) {
      throw new Error('Test error message')
    }
    return <div>No error</div>
  }
}

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalConsoleError
})

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('displays error details in accordion', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const accordion = screen.getByText(/Technical Details/)
    expect(accordion).toBeInTheDocument()
  })

  it('provides retry functionality', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()

    const retryButton = screen.getByText('Try Again')
    retryButton.click()

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('provides reload page functionality', () => {
    // Mock window.location.reload
    const mockReload = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByText('Reload Page')
    reloadButton.click()

    expect(mockReload).toHaveBeenCalled()
  })

  it('provides bug report functionality', () => {
    // Mock window.open
    const mockOpen = vi.fn()
    window.open = mockOpen

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reportButton = screen.getByText('Report Bug')
    reportButton.click()

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('mailto:support@example.com')
    )
  })

  it('calls custom error handler when provided', () => {
    const mockErrorHandler = vi.fn()

    render(
      <ErrorBoundary onError={mockErrorHandler}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(mockErrorHandler).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    )
  })

  it('renders custom fallback UI when provided', () => {
    const customFallback = <div>Custom error UI</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error UI')).toBeInTheDocument()
    expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument()
  })

  it('generates unique error ID for each error', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const firstErrorId = screen.getByText(/Error ID:/)
    const firstId = firstErrorId.textContent?.match(/Error ID: (.+)\)/)?.[1]

    // Reset and trigger new error
    rerender(
      <ErrorBoundary>
        <div>No error</div>
      </ErrorBoundary>
    )

    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const secondErrorId = screen.getByText(/Error ID:/)
    const secondId = secondErrorId.textContent?.match(/Error ID: (.+)\)/)?.[1]

    expect(firstId).toBeDefined()
    expect(secondId).toBeDefined()
    expect(firstId).not.toBe(secondId)
  })

  it('displays stack trace in technical details', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Stack Trace:')).toBeInTheDocument()
    expect(screen.getByText('Error Message:')).toBeInTheDocument()
  })

  it('handles errors with no message gracefully', () => {
    class ThrowErrorNoMessage extends Component {
      render() {
        const error = new Error()
        error.message = ''
        throw error
      }
    }

    render(
      <ErrorBoundary>
        <ThrowErrorNoMessage />
      </ErrorBoundary>
    )

    expect(screen.getByText('Application Error')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred while rendering this component.')).toBeInTheDocument()
  })
})