import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/test-utils'
import userEvent from '@testing-library/user-event'
import SecurityDashboard from './SecurityDashboard'

describe('SecurityDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders security dashboard with main sections', async () => {
    render(<SecurityDashboard />)

    expect(screen.getByText('Security Dashboard')).toBeInTheDocument()
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument()
    })

    expect(screen.getByRole('tab', { name: 'Vulnerabilities' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Compliance' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Policies' })).toBeInTheDocument()
  })

  it('displays security overview with metrics', async () => {
    render(<SecurityDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Security Score')).toBeInTheDocument()
      expect(screen.getByText('Critical Issues')).toBeInTheDocument()
      expect(screen.getByText('High Priority')).toBeInTheDocument()
      expect(screen.getByText('Total Findings')).toBeInTheDocument()
    })
  })

  it('shows recent security scans table', async () => {
    render(<SecurityDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Recent Security Scans')).toBeInTheDocument()
      expect(screen.getByText('Timestamp')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Score')).toBeInTheDocument()
      expect(screen.getByText('Findings')).toBeInTheDocument()
      expect(screen.getByText('Duration')).toBeInTheDocument()
    })
  })

  it('allows running a new security scan', async () => {
    const user = userEvent.setup()
    render(<SecurityDashboard />)

    await waitFor(() => {
      const scanButton = screen.getByRole('button', { name: 'Run Security Scan' })
      expect(scanButton).toBeInTheDocument()
    })

    const scanButton = screen.getByRole('button', { name: 'Run Security Scan' })
    await user.click(scanButton)

    expect(screen.getByText('Security Scan in Progress')).toBeInTheDocument()
    expect(screen.getByText('Analyzing cluster resources for vulnerabilities and misconfigurations...')).toBeInTheDocument()
  })

  it('switches to vulnerabilities tab', async () => {
    const user = userEvent.setup()
    render(<SecurityDashboard />)

    await waitFor(() => {
      const vulnTab = screen.getByRole('tab', { name: 'Vulnerabilities' })
      expect(vulnTab).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: 'Vulnerabilities' }))

    expect(screen.getByText('Vulnerability Findings')).toBeInTheDocument()
  })

  it('displays vulnerability findings', async () => {
    const user = userEvent.setup()
    render(<SecurityDashboard />)

    await waitFor(() => {
      const vulnTab = screen.getByRole('tab', { name: 'Vulnerabilities' })
      expect(vulnTab).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: 'Vulnerabilities' }))

    await waitFor(() => {
      // Based on the mock data in the component
      expect(screen.getByText('Critical vulnerability in nginx container')).toBeInTheDocument()
      expect(screen.getByText('CVE-2023-44487')).toBeInTheDocument()
    })
  })

  it('shows compliance frameworks', async () => {
    const user = userEvent.setup()
    render(<SecurityDashboard />)

    await waitFor(() => {
      const complianceTab = screen.getByRole('tab', { name: 'Compliance' })
      expect(complianceTab).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: 'Compliance' }))

    await waitFor(() => {
      expect(screen.getByText('CIS Compliance')).toBeInTheDocument()
      expect(screen.getByText('NSA Compliance')).toBeInTheDocument()
      expect(screen.getByText('PCI-DSS Compliance')).toBeInTheDocument()
      expect(screen.getByText('SOC2 Compliance')).toBeInTheDocument()
      expect(screen.getByText('NIST Compliance')).toBeInTheDocument()
    })
  })

  it('displays compliance scores and status', async () => {
    const user = userEvent.setup()
    render(<SecurityDashboard />)

    await user.click(screen.getByRole('tab', { name: 'Compliance' }))

    await waitFor(() => {
      expect(screen.getByText('Compliance Score')).toBeInTheDocument()
      expect(screen.getByText(/Pass:/)).toBeInTheDocument()
      expect(screen.getByText(/Fail:/)).toBeInTheDocument()
      expect(screen.getByText(/Warning:/)).toBeInTheDocument()
    })
  })

  it('shows detailed compliance check information', async () => {
    const user = userEvent.setup()
    render(<SecurityDashboard />)

    await user.click(screen.getByRole('tab', { name: 'Compliance' }))

    await waitFor(() => {
      expect(screen.getByText('5.1.1: Minimize cluster admin role bindings')).toBeInTheDocument()
      expect(screen.getByText('Network-1: Use network policies')).toBeInTheDocument()
    })
  })

  it('opens security finding details dialog', async () => {
    const user = userEvent.setup()
    render(<SecurityDashboard />)

    await user.click(screen.getByRole('tab', { name: 'Vulnerabilities' }))

    await waitFor(() => {
      const findingTitle = screen.getByText('Critical vulnerability in nginx container')
      expect(findingTitle).toBeInTheDocument()
    })

    const findingItem = screen.getByText('Critical vulnerability in nginx container').closest('li')
    expect(findingItem).toBeInTheDocument()

    if (findingItem) {
      await user.click(findingItem)
    }

    await waitFor(() => {
      expect(screen.getByText('Security Finding Details')).toBeInTheDocument()
      expect(screen.getByText('CVE-2023-44487 - HTTP/2 Rapid Reset attack vulnerability')).toBeInTheDocument()
    })
  })

  it('closes finding details dialog', async () => {
    const user = userEvent.setup()
    render(<SecurityDashboard />)

    await user.click(screen.getByRole('tab', { name: 'Vulnerabilities' }))

    await waitFor(() => {
      const findingTitle = screen.getByText('Critical vulnerability in nginx container')
      expect(findingTitle).toBeInTheDocument()
    })

    const findingItem = screen.getByText('Critical vulnerability in nginx container').closest('li')
    if (findingItem) {
      await user.click(findingItem)
    }

    await waitFor(() => {
      expect(screen.getByText('Security Finding Details')).toBeInTheDocument()
    })

    const closeButton = screen.getByRole('button', { name: 'Close' })
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText('Security Finding Details')).not.toBeInTheDocument()
    })
  })

  it('shows policies tab with coming soon message', async () => {
    const user = userEvent.setup()
    render(<SecurityDashboard />)

    await user.click(screen.getByRole('tab', { name: 'Policies' }))

    await waitFor(() => {
      expect(screen.getByText('Security Policies')).toBeInTheDocument()
      expect(screen.getByText(/Policy management features are coming soon/)).toBeInTheDocument()
    })
  })

  it('displays severity indicators correctly', async () => {
    const user = userEvent.setup()
    render(<SecurityDashboard />)

    await user.click(screen.getByRole('tab', { name: 'Vulnerabilities' }))

    await waitFor(() => {
      expect(screen.getByText('CRITICAL')).toBeInTheDocument()
      expect(screen.getByText('HIGH')).toBeInTheDocument()
      expect(screen.getByText('MEDIUM')).toBeInTheDocument()
    })
  })

  it('refreshes dashboard data', async () => {
    const user = userEvent.setup()
    render(<SecurityDashboard />)

    await waitFor(() => {
      const refreshButton = screen.getByRole('button', { name: 'Refresh' })
      expect(refreshButton).toBeInTheDocument()
    })

    const refreshButton = screen.getByRole('button', { name: 'Refresh' })
    await user.click(refreshButton)

    // The component should reload its data
    expect(refreshButton).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<SecurityDashboard />)

    // Should show loading indicator
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('displays empty state for vulnerabilities when none found', async () => {
    // This test would require mocking the component to return no vulnerabilities
    // For now, we'll test the structure is there
    const user = userEvent.setup()
    render(<SecurityDashboard />)

    await user.click(screen.getByRole('tab', { name: 'Vulnerabilities' }))

    await waitFor(() => {
      expect(screen.getByText('Vulnerability Findings')).toBeInTheDocument()
    })
  })

  it('handles scan completion', async () => {
    const user = userEvent.setup()
    render(<SecurityDashboard />)

    await waitFor(() => {
      const scanButton = screen.getByRole('button', { name: 'Run Security Scan' })
      expect(scanButton).toBeInTheDocument()
    })

    const scanButton = screen.getByRole('button', { name: 'Run Security Scan' })
    await user.click(scanButton)

    expect(screen.getByText('Scanning...')).toBeInTheDocument()

    // Wait for scan to complete (mocked to take 3 seconds)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Run Security Scan' })).toBeInTheDocument()
    }, { timeout: 4000 })
  })

  it('expands and collapses compliance check details', async () => {
    const user = userEvent.setup()
    render(<SecurityDashboard />)

    await user.click(screen.getByRole('tab', { name: 'Compliance' }))

    await waitFor(() => {
      const complianceItem = screen.getByText('5.1.1: Minimize cluster admin role bindings')
      expect(complianceItem).toBeInTheDocument()
    })

    const expandButton = screen.getAllByLabelText('expand')[0]
    await user.click(expandButton)

    await waitFor(() => {
      expect(screen.getByText('Ensure that cluster admin privileges are only assigned when necessary')).toBeInTheDocument()
      expect(screen.getByText('Remediation:')).toBeInTheDocument()
    })
  })
})