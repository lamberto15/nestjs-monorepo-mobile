import { render, screen } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import { CustomFieldsInputs } from '@/features/records/custom-fields';
import type { ListMetadata } from '@/features/records/list';

const metadata = {
  fields: [
    {
      name: 'custom.mystatus',
      label: 'My Status',
      type: 'enum',
      options: ['kumain', 'kinain'],
      custom: true,
    },
  ],
} as unknown as ListMetadata;

test("the API's error for a custom field shows under it", async () => {
  // A required field left empty: the API names it `custom.<key>`.
  const error = new ApiError({
    status: 400,
    code: 'validation_failed',
    errors: [{ path: 'custom.mystatus', message: 'My Status is required' }],
  });
  await render(
    <CustomFieldsInputs
      metadata={metadata}
      values={{}}
      onChange={() => undefined}
      error={error}
    />,
  );
  expect(screen.getByText('My Status is required')).toBeTruthy();
});
