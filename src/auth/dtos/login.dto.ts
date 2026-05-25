/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
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