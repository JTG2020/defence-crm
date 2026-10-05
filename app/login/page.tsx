import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction } from "@/lib/supabase/actions";
import { missingConfigSetting } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const missing = missingConfigSetting();

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-4">
      <div>
        <h1 className="text-lg font-semibold">Defence contract CRM</h1>
        <p className="text-sm text-muted-foreground">Sign in to the defence contract CRM.</p>
      </div>

      {missing ? (
        <Card className="border-warning bg-warning text-warning-foreground">
          <CardContent className="pt-4 text-sm">
            Configuration missing: <code className="font-semibold">{missing}</code>. Add it to{" "}
            <code>.env</code>, restart the server, and sign in.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <form action={signInAction} className="space-y-3">
              <input type="hidden" name="next" value={next ?? "/"} />
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-xs text-danger-foreground" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Accounts are invite-only. There is no self sign-up; a user is created in the Supabase
        dashboard.
      </p>
    </div>
  );
}
