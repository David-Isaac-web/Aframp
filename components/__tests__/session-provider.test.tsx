import { render, screen, waitFor } from '@testing-library/react';
import { SessionProvider, useSession } from '../session-provider';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function TestConsumer() {
  const { session, isLoading } = useSession();
  if (isLoading) return <div>loading</div>;
  if (!session) return <div>no-session</div>;
  return (
    <div>
      <span data-testid="userId">{session.userId}</span>
      <span data-testid="merchantId">{session.merchantId}</span>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <SessionProvider>
      <TestConsumer />
    </SessionProvider>,
  );
}

describe('SessionProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('exposes only non-secret session fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ userId: 'user-1', merchantId: 'merchant-1' }),
    });

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('userId')).toHaveTextContent('user-1'));
    expect(screen.getByTestId('merchantId')).toHaveTextContent('merchant-1');
  });

  it('does not expose a token even if the API returns one', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: 'user-1',
        merchantId: 'merchant-1',
        token: 'should-not-leak',
      }),
    });

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('userId')).toHaveTextContent('user-1'));
    expect(screen.queryByText('should-not-leak')).not.toBeInTheDocument();
  });

  it('renders no-session when the session endpoint returns 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    renderWithProvider();

    await waitFor(() => expect(screen.getByText('no-session')).toBeInTheDocument());
  });
});
