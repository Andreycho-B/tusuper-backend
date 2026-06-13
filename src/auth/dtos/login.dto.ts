/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty, IsEmail, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
    @IsEmail({}, { message: 'El email debe tener un formato valido' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(254)
    @ApiProperty()
    readonly email: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    @ApiProperty()
    readonly password: string;

}