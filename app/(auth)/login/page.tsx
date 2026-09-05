import { AppLogo } from "@/components/brand/app-logo";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <AppLogo variant="login" />
          </div>
          <CardTitle className="sr-only">TYL</CardTitle>
          <CardDescription className="sr-only">Track Your Litres</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Station · IST · INR
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
