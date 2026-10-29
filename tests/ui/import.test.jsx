// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './renderApp.jsx';
import { createDemoBackend } from '../../src/lib/backend/demoBackend.js';

const CSV =
  'Item #,Title,Category,Price,Description\n' +
  'DEMO-001,Example: cordless drill kit,Tools,119.99,"Example listing for demo mode."\n' +
  'NEW-77,"Lamp, brass",home goods,45,"Line one\nLine two"\n';

async function signedInOwner() {
  const backend = createDemoBackend();
  await backend.signIn();
  return backend;
}

async function uploadAndPreview(user, csv = CSV) {
  const input = await screen.findByLabelText('Spreadsheet file');
  await user.upload(input, new File([csv], 'inventory.csv', { type: 'text/csv' }));
  await screen.findByRole('heading', { name: '3. Match your columns' });
  expect(screen.getByLabelText(/Item number/, { selector: 'select' })).toHaveValue('Item #');
  await user.click(screen.getByRole('button', { name: 'Prepare preview' }));
  return screen.findByRole('heading', { name: '5. Review and publish' });
}

describe('owner import flow', () => {
  it('previews field-level changes, requires a status choice for new items, and publishes once', async () => {
    const user = userEvent.setup();
    const backend = await signedInOwner();
    renderApp('/owner/import', backend);
    await uploadAndPreview(user);

    const changes = screen.getByText(/Changes to existing items/).closest('details');
    expect(within(changes).getByText('$119.99')).toBeInTheDocument();
    const publish = screen.getByRole('button', { name: /Publish 2 changes/ });
    expect(publish).toBeDisabled();
    expect(screen.getByText(/Choose a publication status for 1 new item/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Draft/ }));
    expect(publish).toBeEnabled();
    await user.dblClick(publish);

    expect(await screen.findByText('Published inventory.csv.')).toBeInTheDocument();
    const state = backend._getState();
    expect(state.runs).toHaveLength(1);
    expect(state.items.find((i) => i.item_id === 'NEW-77')).toMatchObject({ status: 'draft', category: 'Home Goods', description: 'Line one\nLine two' });
    expect(state.items.find((i) => i.item_id === 'DEMO-001').price).toBe(119.99);
  });

  it('rejects a stale preview and publishes after refreshing it', async () => {
    const user = userEvent.setup();
    const backend = await signedInOwner();
    renderApp('/owner/import', backend);
    await uploadAndPreview(user);
    await user.click(screen.getByRole('radio', { name: /Draft/ }));
    await backend.setItemStatus('DEMO-002', 'sold'); // someone changes inventory meanwhile
    await user.click(screen.getByRole('button', { name: /Publish 2 changes/ }));
    expect(await screen.findByText('Inventory changed since this preview was prepared.')).toBeInTheDocument();
    expect(backend._getState().runs).toHaveLength(0);
    await user.click(screen.getAllByRole('button', { name: 'Refresh preview' })[0]);
    await user.click(await screen.findByRole('button', { name: /Publish 2 changes/ }));
    expect(await screen.findByText('Published inventory.csv.')).toBeInTheDocument();
  });

  it('blocks complete imports with any invalid row', async () => {
    const user = userEvent.setup();
    const backend = await signedInOwner();
    renderApp('/owner/import', backend);
    const bad = CSV + 'DEMO-003,Guitar,Musical Instruments,-5,x\n';
    const input = await screen.findByLabelText('Spreadsheet file');
    await user.upload(input, new File([bad], 'inventory.csv', { type: 'text/csv' }));
    await user.click(await screen.findByRole('radio', { name: /complete inventory/ }));
    await user.click(screen.getByRole('button', { name: 'Prepare preview' }));
    await screen.findByRole('heading', { name: '5. Review and publish' });
    expect(screen.getByText(/negative/)).toBeInTheDocument();
    expect(screen.getByText(/Complete inventory imports can't be published/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Publish/ })).toBeDisabled();
    // Items not in the file are listed for review; DEMO-003 has an invalid row, so it is NOT treated as missing.
    const archives = screen.getByText(/To be archived \(/).closest('details');
    expect(archives).toHaveTextContent('DEMO-002');
    expect(archives).not.toHaveTextContent('DEMO-003');
  });

  it('rejects duplicate headers before mapping', async () => {
    const user = userEvent.setup();
    renderApp('/owner/import', await signedInOwner());
    await user.upload(await screen.findByLabelText('Spreadsheet file'), new File(['id,Price,price\n1,2,3\n'], 'dup.csv', { type: 'text/csv' }));
    expect(await screen.findByText(/both have the heading "price"/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '3. Match your columns' })).not.toBeInTheDocument();
  });
});
