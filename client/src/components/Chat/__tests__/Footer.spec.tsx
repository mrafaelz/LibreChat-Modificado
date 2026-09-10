import { render } from '@testing-library/react';
import Footer from '../Footer';

jest.mock('react-gtm-module', () => ({
  __esModule: true,
  default: { initialize: jest.fn() },
}));

jest.mock('~/data-provider', () => ({
  useGetStartupConfig: jest.fn(() => ({ data: undefined, isFetching: false, error: null })),
}));

describe('Footer', () => {
  test('does not render footer content', () => {
    const { container } = render(<Footer startupConfig={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
