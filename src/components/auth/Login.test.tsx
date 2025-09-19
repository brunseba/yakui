import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import Login from './Login'

// Mock the auth hook
const mockLogin = vi.fn()
const mockClearError = vi.fn()

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    state: {
      loading: false,
      error: null,
    },
    login: mockLogin,
    clearError: mockClearError,
  }),
}))

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form with both tabs', () => {
    render(<Login />)

    expect(screen.getByText('Kubernetes Admin UI')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Upload Kubeconfig' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Paste Config' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Connect to Cluster' })).toBeInTheDocument()
  })

  it('allows switching between upload and paste tabs', async () => {
    const user = userEvent.setup()
    render(<Login />)

    // Start with upload tab
    expect(screen.getByText('Select kubeconfig file')).toBeInTheDocument()

    // Switch to paste tab
    await user.click(screen.getByRole('tab', { name: 'Paste Config' }))

    expect(screen.getByLabelText('Kubeconfig Content')).toBeInTheDocument()
  })

  it('shows context selector when kubeconfig is provided', async () => {
    const user = userEvent.setup()
    render(<Login />)

    // Switch to paste tab
    await user.click(screen.getByRole('tab', { name: 'Paste Config' }))

    const textArea = screen.getByLabelText('Kubeconfig Content')
    await user.type(textArea, `
apiVersion: v1
kind: Config
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
- context:
    cluster: another-cluster
    user: another-user
  name: another-context
current-context: test-context
`)

    await waitFor(() => {
      expect(screen.getByLabelText('Context')).toBeInTheDocument()
    })

    // Should show context options
    const contextSelect = screen.getByLabelText('Context')
    fireEvent.mouseDown(contextSelect)
    
    await waitFor(() => {
      expect(screen.getByText('test-context')).toBeInTheDocument()
      expect(screen.getByText('another-context')).toBeInTheDocument()
    })
  })

  it('calls login function on form submission', async () => {
    const user = userEvent.setup()
    render(<Login />)

    // Switch to paste tab
    await user.click(screen.getByRole('tab', { name: 'Paste Config' }))

    const textArea = screen.getByLabelText('Kubeconfig Content')
    await user.type(textArea, `
apiVersion: v1
kind: Config
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
current-context: test-context
`)

    await waitFor(() => {
      expect(screen.getByLabelText('Context')).toBeInTheDocument()
    })

    const submitButton = screen.getByRole('button', { name: 'Connect to Cluster' })
    await user.click(submitButton)

    expect(mockLogin).toHaveBeenCalledWith({
      kubeconfig: expect.stringContaining('apiVersion: v1'),
      context: 'test-context',
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<Login />)

    const submitButton = screen.getByRole('button', { name: 'Connect to Cluster' })
    await user.click(submitButton)

    expect(screen.getByText('Please provide a kubeconfig file or paste the content')).toBeInTheDocument()
  })

  it('shows loading state during login', () => {
    // Mock loading state
    vi.mocked(vi.fn()).mockImplementation(() => ({
      useAuth: () => ({
        state: {
          loading: true,
          error: null,
        },
        login: mockLogin,
        clearError: mockClearError,
      }),
    }))

    render(<Login />)

    const submitButton = screen.getByRole('button', { name: /connecting/i })
    expect(submitButton).toBeDisabled()
  })

  it('displays error message when login fails', () => {
    // Mock error state
    const mockError = 'Invalid kubeconfig format'
    vi.mocked(vi.fn()).mockImplementation(() => ({
      useAuth: () => ({
        state: {
          loading: false,
          error: mockError,
        },
        login: mockLogin,
        clearError: mockClearError,
      }),
    }))

    render(<Login />)

    expect(screen.getByText(mockError)).toBeInTheDocument()
  })

  it('clears error when user starts typing', async () => {
    const user = userEvent.setup()
    
    // Mock error state
    vi.mocked(vi.fn()).mockImplementation(() => ({
      useAuth: () => ({
        state: {
          loading: false,
          error: 'Previous error',
        },
        login: mockLogin,
        clearError: mockClearError,
      }),
    }))

    render(<Login />)

    // Switch to paste tab and start typing
    await user.click(screen.getByRole('tab', { name: 'Paste Config' }))
    const textArea = screen.getByLabelText('Kubeconfig Content')
    await user.type(textArea, 'some content')

    expect(mockClearError).toHaveBeenCalled()
  })

  it('handles file upload', async () => {
    const user = userEvent.setup()
    render(<Login />)

    const fileContent = `
apiVersion: v1
kind: Config
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
current-context: test-context
`

    const file = new File([fileContent], 'kubeconfig', { type: 'text/plain' })
    const fileInput = screen.getByLabelText('Select kubeconfig file')

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByLabelText('Context')).toBeInTheDocument()
    })
  })

  it('shows different contexts from kubeconfig', async () => {
    const user = userEvent.setup()
    render(<Login />)

    // Switch to paste tab
    await user.click(screen.getByRole('tab', { name: 'Paste Config' }))

    const kubeconfigWithMultipleContexts = `
apiVersion: v1
kind: Config
contexts:
- context:
    cluster: production
    user: admin
  name: prod-admin
- context:
    cluster: staging
    user: developer
  name: staging-dev
- context:
    cluster: dev
    user: tester
  name: dev-test
current-context: prod-admin
`

    const textArea = screen.getByLabelText('Kubeconfig Content')
    await user.type(textArea, kubeconfigWithMultipleContexts)

    await waitFor(() => {
      expect(screen.getByLabelText('Context')).toBeInTheDocument()
    })

    const contextSelect = screen.getByLabelText('Context')
    fireEvent.mouseDown(contextSelect)

    await waitFor(() => {
      expect(screen.getByText('prod-admin')).toBeInTheDocument()
      expect(screen.getByText('staging-dev')).toBeInTheDocument()
      expect(screen.getByText('dev-test')).toBeInTheDocument()
    })
  })

  it('uses current-context as default selection', async () => {
    const user = userEvent.setup()
    render(<Login />)

    // Switch to paste tab
    await user.click(screen.getByRole('tab', { name: 'Paste Config' }))

    const kubeconfigWithCurrentContext = `
apiVersion: v1
kind: Config
contexts:
- context:
    cluster: test1
    user: user1
  name: context1
- context:
    cluster: test2
    user: user2
  name: context2
current-context: context2
`

    const textArea = screen.getByLabelText('Kubeconfig Content')
    await user.type(textArea, kubeconfigWithCurrentContext)

    await waitFor(() => {
      const contextSelect = screen.getByLabelText('Context')
      expect(contextSelect).toHaveDisplayValue('context2')
    })
  })

  it('handles invalid kubeconfig format gracefully', async () => {
    const user = userEvent.setup()
    render(<Login />)

    // Switch to paste tab
    await user.click(screen.getByRole('tab', { name: 'Paste Config' }))

    const textArea = screen.getByLabelText('Kubeconfig Content')
    await user.type(textArea, 'invalid yaml content')

    // Should not crash and should not show context selector
    await waitFor(() => {
      expect(screen.queryByLabelText('Context')).not.toBeInTheDocument()
    })
  })

  it('enables submit button only when form is valid', async () => {
    const user = userEvent.setup()
    render(<Login />)

    const submitButton = screen.getByRole('button', { name: 'Connect to Cluster' })
    expect(submitButton).toBeEnabled()

    // Switch to paste tab
    await user.click(screen.getByRole('tab', { name: 'Paste Config' }))

    const textArea = screen.getByLabelText('Kubeconfig Content')
    await user.type(textArea, `
apiVersion: v1
kind: Config
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
current-context: test-context
`)

    await waitFor(() => {
      expect(submitButton).toBeEnabled()
    })
  })
})