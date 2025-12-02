import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener minúsculas, números y guiones.',
  })
  readonly slug: string;
}
