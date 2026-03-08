import * as React from 'react';
import { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

/**
 * This component is a placeholder for FormControl to correctly set the shrink label state on SSR.
 */
function SSRInitialFilled(_: BaseNumberField.Root.Props) {
  return null;
}
SSRInitialFilled.muiName = 'Input';

export default function NumberField({
  id: idProp,
  label,
  error,
  helperText,
  fullWidth = true,
  size = 'medium',
  onChange,
  onValueChange,
  ...other
}: Omit<BaseNumberField.Root.Props, 'onChange'> & {
  label?: React.ReactNode;
  size?: 'small' | 'medium';
  error?: boolean;
  helperText?: React.ReactNode;
  fullWidth?: boolean;
  onChange?: (value: number | null, details: BaseNumberField.Root.ChangeEventDetails) => void;
  onValueChange?: (value: number | null, details: BaseNumberField.Root.ChangeEventDetails) => void;
}) {
  let id = React.useId();
  if (idProp) {
    id = idProp;
  }

  const handleValueChange = onValueChange ?? onChange;

  return (
    <BaseNumberField.Root
      {...other}
      onValueChange={handleValueChange}
      render={(props, state) => (
        <FormControl
          size={size}
          ref={props.ref}
          disabled={state.disabled}
          required={state.required}
          error={error}
          fullWidth={fullWidth}
          variant="outlined"
          sx={{ width: fullWidth ? '100%' : undefined }}
        >
          {props.children}
        </FormControl>
      )}
    >
      <SSRInitialFilled {...other} />
      <InputLabel htmlFor={id} size={size}>
        {label}
      </InputLabel>
      <BaseNumberField.Input
        id={id}
        render={(props, state) => (
          <OutlinedInput
            label={label}
            size={size}
            inputRef={props.ref}
            value={state.inputValue}
            onBlur={props.onBlur}
            onChange={props.onChange}
            onKeyUp={props.onKeyUp}
            onKeyDown={props.onKeyDown}
            onFocus={props.onFocus}
            slotProps={{
              input: props,
            }}
            endAdornment={
              <InputAdornment
                position="end"
                sx={{
                  flexDirection: 'column',
                  maxHeight: 'unset',
                  alignSelf: 'stretch',
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                  ml: 0,
                  minWidth: size === 'small' ? 28 : 32,
                  '& button': {
                    width: '100%',
                    flex: 1,
                    borderRadius: 0,
                    m: 0,
                    p: 0,
                  },
                }}
              >
                <BaseNumberField.Increment render={<IconButton size={size} aria-label="Increase" />}>
                  <KeyboardArrowUpIcon fontSize={size} sx={{ transform: 'translateY(2px)' }} />
                </BaseNumberField.Increment>

                <BaseNumberField.Decrement render={<IconButton size={size} aria-label="Decrease" />}>
                  <KeyboardArrowDownIcon fontSize={size} sx={{ transform: 'translateY(-2px)' }} />
                </BaseNumberField.Decrement>
              </InputAdornment>
            }
            sx={{
              pr: 0,
              '& .MuiOutlinedInput-input': {
                boxSizing: 'border-box',
              },
            }}
          />
        )}
      />
      {helperText ? <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText> : null}
    </BaseNumberField.Root>
  );
}
