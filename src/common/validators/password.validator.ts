import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

/**
 * Centralized password policy.
 *
 * Enforced on every endpoint that accepts a new or rotated password:
 *  - POST /auth/register                (RegisterDto.password)
 *  - POST /users                        (CreateUserDto.password)
 *  - POST /auth/reset-password          (ResetPasswordDto.newPassword)
 *  - PATCH /users/me/password           (UpdatePasswordDto.newPassword)
 *
 * Rationale:
 *  - 8 chars minimum aligns with OWASP ASVS L1 and NIST SP 800-63B
 *  - Mixed case + digit dramatically reduces dictionary attack success
 *  - We intentionally do NOT require special chars: research shows it
 *    hurts UX without meaningfully improving entropy when length+mix
 *    are already enforced.
 *
 * Existing weak passwords are not retroactively invalidated; users keep
 * access until they next change their password. A future PR may force
 * a reset for accounts below this policy.
 */
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas y un número';

/**
 * Composite decorator that applies the full password policy to a string
 * field in a DTO. Use on every new/rotated password input.
 *
 * @example
 *   export class RegisterDto {
 *     ⁣@IsStrongPassword()
 *     readonly password: string;
 *   }
 */
export function IsStrongPassword(): PropertyDecorator {
  return applyDecorators(
    IsString({ message: 'La contraseña debe ser una cadena de texto' }),
    IsNotEmpty({ message: 'La contraseña es obligatoria' }),
    MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_POLICY_MESSAGE }),
    Matches(PASSWORD_REGEX, { message: PASSWORD_POLICY_MESSAGE }),
  );
}
