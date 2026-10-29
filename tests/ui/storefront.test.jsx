// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { nav, renderApp } from './renderApp.jsx';
import { parseFilters, serializeFilters, DEFAULT_FILTERS } from '../../src/lib/url/filters.js';

const location = () => screen.getByTestId('location').textContent;

describe('filters in the URL', () => {
  it('falls back to defaults and has no price ceiling', () => {
    expect(parseFilters(new URLSearchParams(''))).toEqual(DEFAULT_FILTERS);
    expect(parseFilters(new URLSearchParams('sort=bogus&page=-2&max=abc'))).toEqual(DEFAULT_FILTERS);
    const f = parseFilters(new URLSearchParams('max=0&min=0'));
    expect([f.min, f.max]).toEqual([0, 0]);
    expect(serializeFilters(f).toString()).toBe('min=0&max=0');
  });
});

describe('storefront', () => {
  it('lists active inventory with no default price ceiling and without sold items', async () => {
    renderApp('/inventory');
    expect(await screen.findByText('7 items available')).toBeInTheDocument();
    expect(screen.getByText('Example: estate ring')).toBeInTheDocument(); // $5,750
    expect(screen.queryByText('Example: game console')).not.toBeInTheDocument(); // sold
    expect(screen.queryByText(/draft\)/)).not.toBeInTheDocument();
  });

  it('restores filters from the URL and treats zero as a real bound', async () => {
    renderApp('/inventory?max=0');
    expect(await screen.findByText('No items match these filters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove filter Up to \$0.00/ })).toBeInTheDocument();
  });

  it('updates the URL when a filter changes and resets on "Clear all filters"', async () => {
    const user = userEvent.setup();
    renderApp('/inventory');
    await screen.findByText('7 items available');
    const [desktop] = screen.getAllByLabelText('Category').slice(-1);
    await waitFor(() => expect(within(desktop).getAllByRole('option').length).toBeGreaterThan(1));
    await user.selectOptions(desktop, 'Tools');
    expect(location()).toBe('/inventory?category=Tools');
    expect(await screen.findByText('3 items available')).toBeInTheDocument();
    await user.click(screen.getAllByRole('link', { name: 'Clear all filters' })[0]);
    expect(location()).toBe('/inventory');
  });

  it('opens items by shareable URL, including leading-zero IDs', async () => {
    renderApp('/item/00491');
    expect(await screen.findByRole('heading', { level: 1, name: /socket set/ })).toBeInTheDocument();
    expect(screen.getAllByText('00491').length).toBeGreaterThan(0);
  });

  it('shows not-found for draft and archived items, and a sold notice for sold items', async () => {
    const { unmount } = renderApp('/item/DEMO-005');
    expect(await screen.findByRole('heading', { name: 'Item not found' })).toBeInTheDocument();
    unmount();
    const a = renderApp('/item/DEMO-010');
    expect(await screen.findByRole('heading', { name: 'Item not found' })).toBeInTheDocument();
    a.unmount();
    renderApp('/item/DEMO-004');
    expect(await screen.findByText('This item has been sold and is no longer available.')).toBeInTheDocument();
  });

  it('navigates to related items by link and supports Back/Forward', async () => {
    const user = userEvent.setup();
    renderApp('/item/DEMO-001');
    await screen.findByRole('heading', { level: 1, name: /cordless drill/ });
    const related = await screen.findByRole('region', { name: 'More Tools' });
    await user.click(within(related).getByRole('link', { name: /circular saw/ }));
    expect(location()).toBe('/item/DEMO-006');
    expect(await screen.findByRole('heading', { level: 1, name: /circular saw/ })).toBeInTheDocument();
    act(() => nav.go(-1));
    expect(location()).toBe('/item/DEMO-001');
    expect(await screen.findByRole('heading', { level: 1, name: /cordless drill/ })).toBeInTheDocument();
    act(() => nav.go(1));
    expect(await screen.findByRole('heading', { level: 1, name: /circular saw/ })).toBeInTheDocument();
  });

  it('hides the Sell & Pawn page and nav link until the owner enables it in shop config', async () => {
    renderApp('/sell');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sell & Pawn' })).not.toBeInTheDocument();
  });

  it('names the browser tab after the item being viewed', async () => {
    renderApp('/item/00491');
    await screen.findByRole('heading', { level: 1, name: /socket set/ });
    await waitFor(() => expect(document.title).toBe('Example: socket set (leading-zero ID) (00491)'));
  });

  it('filters by category from the quick category buttons', async () => {
    const user = userEvent.setup();
    renderApp('/inventory');
    await screen.findByText('7 items available');
    await user.click(await screen.findByRole('button', { name: /^Jewelry/ }));
    expect(location()).toBe('/inventory?category=Jewelry');
    expect(await screen.findByText('2 items available')).toBeInTheDocument();
  });

  it('keeps owner pages behind sign-in', async () => {
    renderApp('/owner/import');
    expect(await screen.findByRole('heading', { name: 'Owner sign-in' })).toBeInTheDocument();
    expect(location()).toBe('/owner/sign-in?next=%2Fowner%2Fimport');
  });
});
