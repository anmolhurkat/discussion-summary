"use client";

import { Button } from "@/components/ui/button";
import { LinkCard } from "./_components/link-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { InfoIcon, Spinner } from "@/components/common/icons";
import { Key } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import useAuthStore from "@/lib/useAuthStore";

export default function Home() {
  const [accessToken, setAccessToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  const insertUser = useMutation(api.user.createUser);

  const { isAuthenticated, login, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
    setIsCheckingToken(false);
  }, [checkAuth]);

  const handleTokenSubmit = async () => {
    if (accessToken.length < 60 || !accessToken.match(/^[a-zA-Z0-9~]+$/)) {
      toast.error("Invalid API access token", { position: "top-center" });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: accessToken }),
      });

      const data = await response.json();

      if (response.ok) {
        const { userData } = data;
        insertUser({ name: userData.name, userId: userData.userId });
        login({ token: accessToken, userId: userData.userId });
        toast.success("API token validated successfully", {
          position: "top-center",
        });
      } else {
        toast.error(data.error || "Failed to validate API token", {
          position: "top-center",
        });
      }
    } catch (error: any) {
      toast.error(error.message, { position: "top-center" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) return null;

  return (
    <main className="flex-grow flex items-start pt-20 px-4">
      <Card className="max-w-3xl w-full mx-auto bg-white dark:bg-[#1D1D1F] shadow-lg rounded-2xl overflow-hidden border-0">
        <CardHeader className="bg-gray-100/50 dark:bg-[#1D1D1F] p-6 border-b border-gray-200 dark:border-[#2D2D2F]">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-semibold">
              Canvas Discussion Summarizer
            </CardTitle>
          </div>
          <CardDescription className="text-gray-600 dark:text-[#86868B] mt-2">
            Generate summaries of Human Event discussion boards in seconds
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6 mb-3">
          {!isAuthenticated ? (
            <div className="space-y-10">
              <div className="space-y-2">
                <Label
                  htmlFor="access-token"
                  className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Canvas API Access Token
                </Label>
                <form className="flex space-x-2">
                  <Input
                    type="password"
                    placeholder="Enter your API access token"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="flex-grow rounded-lg border-gray-300 dark:border-[#2D2D2F] dark:bg-[#1D1D1F] dark:text-white focus:ring-2 focus:ring-[#2997FF] dark:focus:ring-[#2997FF] focus:border-transparent"
                  />
                  <Button
                    onClick={(e) => {
                      if (!accessToken) {
                        return;
                      }
                      e.preventDefault();
                      handleTokenSubmit();
                    }}
                    disabled={isLoading || !accessToken}
                    className="bg-[#2997FF] hover:bg-[#147CE5] text-white font-semibold py-2 px-4 rounded-lg transition-colors min-w-[120px]"
                  >
                    {isLoading ? (
                      <Spinner />
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Submit
                      </>
                    )}
                  </Button>
                </form>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Note: Token is stored locally in the browser.
                </p>
              </div>
              <div className="shadow-sm bg-muted/50 rounded-2xl p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-gray-700">
                <p className="flex flex-row justify-center gap-2 items-center">
                  <InfoIcon />
                  <span className="font-semibold">How to get your token</span>
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Login to canvas.asu.edu</li>
                  <li>Click on account on the sidebar</li>
                  <li>Click on settings</li>
                  <li>
                    Under "Approved Integrations" click on "New Access Token"
                  </li>
                  <li>
                    Enter a purpose (optional) and leave the expiry date blank
                  </li>
                  <li>Click on "Generate token"</li>
                  <li>Copy paste the generated token here</li>
                </ol>
              </div>
            </div>
          ) : (
            <LinkCard />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
