import { STEPPER_FORM_KEYS } from '@app/lib/utils/context';

export type StepperFormKeysType =
  (typeof STEPPER_FORM_KEYS)[keyof typeof STEPPER_FORM_KEYS][number];

export type StepperFormValues = {
  [FieldName in StepperFormKeysType]: FieldName extends
    | 'Video Details'
    | 'Upload Video'
    | 'Thumbnail'
    ? number
    : string;
};
