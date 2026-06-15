import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type CurrentUser = {
  sub: string;
  email: string;
  role: "admin" | "manager" | "viewer";
};

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user as CurrentUser;
});
