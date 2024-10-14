import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DropdownWithKebab from '../components/DropdownWithKebab';
import { k8sDelete } from '@openshift-console/dynamic-plugin-sdk';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  k8sDelete: jest.fn(),
}));

const mockHistoryPush = jest.fn();
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const obj = {
  apiVersion: 'v1',
  kind: 'DNSPolicy',
  group: 'kuadrant.io',
  metadata: {
    name: 'test-resource',
    namespace: 'default',
  },
};

describe('DropdownWithKebab', () => {
  it('renders the dropdown with edit and delete options', async () => {
    render(<DropdownWithKebab obj={obj} />);

    // Open the kebab
    act(() => {
      fireEvent.click(screen.getByLabelText('kebab dropdown toggle'));
    });

    // wait for the edit/delete actions to appear
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('navigates to the edit page on edit click', async () => {
    render(<DropdownWithKebab obj={obj} />);

    // open the dropdown
    act(() => {
      fireEvent.click(screen.getByLabelText('kebab dropdown toggle'));
    });

    // Click on the Edit button, check if history.push was called correctly
    await waitFor(() => fireEvent.click(screen.getByText('Edit')));
    expect(mockHistoryPush).toHaveBeenCalledWith({
      pathname: '/k8s/ns/default/dnspolicy/name/test-resource/edit',
    });
  });

  it('opens the delete modal when delete is clicked', async () => {
    render(<DropdownWithKebab obj={obj} />);

    // open the dropdown
    act(() => {
      fireEvent.click(screen.getByLabelText('kebab dropdown toggle'));
    });

    // click delete
    await waitFor(() => fireEvent.click(screen.getByText('Delete')));

    // check for the modal
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(
      screen.getByText((content) =>
        content.includes('Are you sure you want to delete the resource'),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('test-resource')).toBeInTheDocument();
  });

  it('calls k8sDelete on delete confirm', async () => {
    render(<DropdownWithKebab obj={obj} />);

    // open the modal
    act(() => {
      fireEvent.click(screen.getByLabelText('kebab dropdown toggle'));
    });

    await waitFor(() => fireEvent.click(screen.getByText('Delete')));

    // confirm delete
    await waitFor(() => fireEvent.click(screen.getByText('Delete')));

    // check k8sDelete was called with the correct args
    expect(k8sDelete).toHaveBeenCalledWith({
      model: expect.any(Object),
      resource: obj,
    });
  });

  it('closes the delete modal when cancel is clicked', async () => {
    render(<DropdownWithKebab obj={obj} />);

    act(() => {
      fireEvent.click(screen.getByLabelText('kebab dropdown toggle'));
    });

    await waitFor(() => fireEvent.click(screen.getByText('Delete')));

    // click the Cancel button
    await waitFor(() => fireEvent.click(screen.getByText('Cancel')));

    // check if the modal is closed
    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });
});
