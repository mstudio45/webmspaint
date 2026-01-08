"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import {
  BugOffIcon,
  LockKeyholeIcon,
  LockKeyholeOpenIcon,
  MailPlus,
  PackageIcon,
} from "lucide-react";
import { RainbowButton } from "./magicui/rainbow-button";
import { TimeUpdater } from "./time-updater";
import { QueryResultRow } from "@vercel/postgres";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import { cn, getTimeAgoFromUnix, normalizeEpochMs } from "@/lib/utils";
import React from "react";
import { Badge } from "./ui/badge";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { ShineBorder } from "./magicui/shine-border";
import { Separator } from "@radix-ui/react-separator";
import { ClientCodeBlock, getScriptCode } from "./codeblock";
import { CopyButtonWithText } from "./copy-button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MiniDashboardCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
  subscription: QueryResultRow | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  purchaseHistory: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signout: any;
}

export default function MiniDashboardCard({
  session,
  subscription,
  purchaseHistory,
  signout,
}: MiniDashboardCardProps) {
  const router = useRouter();
  const [hardwareIdDialog, setHardwareIdDialog] = React.useState(false);
  const [getScriptDialog, setGetScriptDialog] = React.useState(false);
  const [getSignOutDialog, setSignOutDialog] = React.useState(false);
  const [getRedeemDialog, setRedeemDialog] = React.useState(false);
  const [getGiftKeyDialog, setGiftKeyDialog] = React.useState(false);

  const [key, setKey] = React.useState<string | null>(null);
  const [getRedeemError, setRedeemError] = React.useState<string | null>(null);

  const validateKey = () => {
    if (!key) {
      return "Please enter a key.";
    }

    if (key.startsWith("https://www.mspaint.cc/purchase/completed?serial=")) {
      try {
        const url = new URL(key);
        const serial = url.searchParams.get("serial");
        if (!serial || serial.length < 10) {
          return "Invalid serial in URL.";
        }
        return null; //valid
      } catch {
        return "Invalid URL format.";
      }
    }

    const codeRegex = /^(\w|\d){16}$/; // adjust length as needed
    if (!codeRegex.test(key)) {
      return "Invalid key format.";
    }

    return null; // valid
  };

  const handleRedeem = () => {
    const errorMsg = validateKey();
    if (errorMsg) {
      setRedeemError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setRedeemError(null);
    toast.info("Redirected to a new page.");

    const formatKey = (key ?? "invalid");
    if (formatKey.startsWith("https://www.mspaint.cc/purchase/completed?serial=")) {
      window.open(formatKey, "_blank");
    } else {
      window.open(`https://www.mspaint.cc/purchase/completed?serial=${encodeURIComponent(formatKey)}`, "_blank");
    }
  };

  if (!session || !session.user) {
    router.push("/sign-in");
    return null;
  }

  const expirationDate = normalizeEpochMs(subscription?.expires_at) ?? 0;
  const userStatus: string = subscription ? subscription.user_status : "unlink";
  const userLuarmorKey = subscription?.lrm_serial ?? "unlink";

  // Determine subscription status
  const isMember = subscription != null;
  const isLifetime = expirationDate == -1;
  const isExpired = !isLifetime && expirationDate - Date.now() <= 0;
  const isKeySystemMember = subscription?.from_key_system === true;

  const isUnlink = userStatus === "unlink";
  const isResetState = userStatus === "reset";
  const isBanned = userStatus === "banned" || subscription?.is_banned;
  const isSubscriptionActive = (!isBanned && isMember) && (userStatus === "active" || isResetState || isLifetime);

  const lastSyncTimeText = getTimeAgoFromUnix(subscription?.last_sync);
  const timeLeftMs = expirationDate - Date.now();

  const discordName = session?.user?.name ?? "";
  const displayName = discordName.length > 16 ? discordName.slice(0, 13) + "..." : discordName;

  return (
    <div className="w-full max-w-md mx-auto sm:mx-0 mt-6">
      <Card className="relative rounded-lg z-10 border-transparent">
        {!isUnlink && isSubscriptionActive && (
          <ShineBorder
            shineColor={["#0f87ff", "#001933", "#1aafff"]}
            className="absolute inset-0  pointer-events-none z-20"
          />
        )}
        <div className="relative -top-3 right-3 z-30">
          <Badge
            variant={"secondary"}
            className="px-2 py-1 text-xs outline-2 outline-accent-background cursor-pointer"
            onClick={() =>
              toast.info(
                "This dashboard still in development and issues may occur.\nIf you find any issues contact https://mspaint.cc/support"
              )
            }
          >
            <InfoCircledIcon className="stroke-[2] mr-1" />
            BETA
          </Badge>
        </div>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              {session.user.image && (
                <div className="relative w-[80px] h-[80px]">
                  <div className="absolute -inset-1 bg-white/10 rounded-full z-0" />

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={session.user.image}
                    alt="Discord Avatar"
                    width={80}
                    height={80}
                    className="rounded-full border-3 border-neutral-50/80 relative z-10"
                  />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="mb-4">
                <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wider text-center sm:text-left">
                  Discord Account
                </h3>
                <p className="text-lg sm:text-xl font-semibold text-white text-center sm:text-left">
                  {displayName}
                </p>
              </div>

              <div className={isMember ? "mb-5" : ""}>
                {isMember ? (
                  <>
                    <div className="w-full flex justify-center sm:justify-start mt-2">
                      <div className="flex items-center space-x-2 text-center sm:text-left">
                        <Badge
                          className="font-bold pointer-events-none"
                          variant={(isBanned || isUnlink) ? "destructive" : "default"}
                        >
                          {userStatus.toUpperCase()}
                        </Badge>
                        <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wider">
                          Subscription Status
                        </h3>
                      </div>
                    </div>
                    <div className="w-full flex justify-center sm:justify-start mt-2">
                      <div className="w-full text-center sm:text-left">
                        {isBanned ? (
                          <p className="text-base text-red-400 mt-2">
                            User is banned, access restricted.
                          </p>
                        ) : !isExpired ? (
                          <div className="flex items-center justify-between w-full -mb-2">
                            {isLifetime ? (
                              <p className="text-base text-green-400">
                                Lifetime access ★
                              </p>
                            ) : (
                              <div className={cn("flex flex-col gap-1", isKeySystemMember ? "mt-2" : "")}>
                                {isKeySystemMember && (
                                  <p className="text-base text-orange-400">
                                    Key From Key System
                                  </p>
                                )}
                                <TimeUpdater
                                  initialTimeLeft={timeLeftMs}
                                  freezeAfterTimeout={true}
                                />
                              </div>
                            )}

                            <Button
                              variant={"outline"}
                              className={cn("w-20 h-8 p-0 text-xs font-bold flex items-center justify-left", isKeySystemMember ? "mt-2" : "")}
                              onClick={() => setGetScriptDialog(true)}
                            >
                              Get Script
                            </Button>

                            <AlertDialog
                              open={getScriptDialog}
                              onOpenChange={setGetScriptDialog}
                            >
                              <AlertDialogContent className="max-w-xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Here is your mspaint script
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Just click the copy button and paste it in
                                    your script executor.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>

                                <div className="overflow-y-auto max-h-[400px] -mb-">
                                  <ClientCodeBlock
                                    serial={userLuarmorKey}
                                    disableCopyButton={true}
                                    classNameBlock="flex flex-col max-h-full border-[5px] border-border/40 rounded-md"
                                  />
                                </div>
                                <CopyButtonWithText
                                  text={getScriptCode(userLuarmorKey)}
                                  customOnClick={() => {
                                    toast.success(
                                      "Script copied to clipboard."
                                    );
                                    setGetScriptDialog(false);
                                  }}
                                />

                                <AlertDialogFooter>
                                  <AlertDialogCancel>Done</AlertDialogCancel>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ) : (
                          <p className="text-base text-red-400 mt-2">
                            Expired - Renew Now!
                          </p>
                        )}
                      </div>
                    </div>

                    <Separator
                      orientation="horizontal"
                      className="bg-border mx-full h-[2px] mt-4"
                    />

                    {(!isBanned) ? (
                      <>
                        {!isExpired && (
                          <>
                            <Button
                              className={cn(
                                "border shadow-xs hover:bg-accent",
                                isResetState
                                  ? "text-white/40 hover:text-accent-foreground dark:bg-input/60 dark:border-input"
                                  : "text-white/80 hover:text-accent-foreground dark:bg-red-200/20 dark:border-input dark:hover:bg-red-400/50 cursor-pointer",
                                "w-full flex items-center justify-center py-2 mt-2"
                              )}
                              onClick={() => setHardwareIdDialog(true)}
                              disabled={isResetState}
                            >
                              {isResetState ? (
                                <LockKeyholeOpenIcon />
                              ) : (
                                <LockKeyholeIcon />
                              )}
                              <span className={"text-xs sm:text-sm"}>
                                {isResetState
                                  ? "HWID already reset"
                                  : "Reset Hardware ID"}
                              </span>
                            </Button>

                            <AlertDialog
                              open={hardwareIdDialog}
                              onOpenChange={setHardwareIdDialog}
                            >
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Confirm HWID reset?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Once you reset your HWID, you&apos;ll have to
                                    wait before doing it again. Make sure it&apos;s
                                    really an invalid HWID issue before proceeding.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <Button
                                    variant={"destructive"}
                                    className="cursor-pointer"
                                    onClick={() => {
                                      if (isBanned || isUnlink) return;
                                      if (isResetState) {
                                        toast.error("Your HWID is already reset.");
                                        return;
                                      }

                                      toast.promise(
                                        (async () => {
                                          const response = await fetch(
                                            "/api/reset-hwid",
                                            {
                                              method: "POST",
                                              headers: {
                                                "Content-Type": "application/json",
                                              },
                                              body: JSON.stringify({
                                                lrm_serial:
                                                  subscription?.lrm_serial,
                                              }),
                                            }
                                          );

                                          if (!response.ok) {
                                            const errorData = await response.json();
                                            throw new Error(
                                              errorData.error ||
                                              "HWID reset failed."
                                            );
                                          }

                                          return await response.json();
                                        })(),
                                        {
                                          loading: "Resetting your HWID...",
                                          success: (data) => {
                                            setHardwareIdDialog(false);
                                            return (
                                              data.success ||
                                              "HWID reset successful!"
                                            );
                                          },
                                          error: (error) => {
                                            setHardwareIdDialog(false);
                                            return error.message;
                                          },
                                        }
                                      );
                                      router.refresh();
                                    }}
                                  >
                                    Continue
                                  </Button>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}

                        {purchaseHistory.length > 0 && (
                          <div className="mt-2">
                            <Sheet>
                              <SheetTrigger asChild>
                                {isMember && (
                                  <Button
                                    variant="secondary"
                                    className="w-full flex items-center justify-center py-2 cursor-pointer"
                                  >
                                    <PackageIcon />
                                    <span className="text-xs sm:text-sm">
                                      Subscription History
                                    </span>
                                  </Button>
                                )}
                              </SheetTrigger>
                              <SheetContent>
                                <SheetHeader>
                                  <SheetTitle>Purchase History</SheetTitle>
                                  <SheetDescription>
                                    Here you can view your past purchases and
                                    subscription history.
                                  </SheetDescription>
                                </SheetHeader>
                                <div className="flex flex-col max-h-[1000px] overflow-y-auto space-y-2 px-2 w-full">
                                  {purchaseHistory.map((purchase, index) => (
                                    <div
                                      key={index}
                                      className="flex flex-row items-center gap-2"
                                    >
                                      <PackageIcon className="min-h-5 min-w-5 max-w-5 max-h-5 w-5 h-5 text-gray-400" />
                                      <div className="px-2 py-2">
                                        <p className="text-sm font-medium">
                                          {purchase.order_id}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          Date:{" "}
                                          {new Date(
                                            purchase.claimed_at
                                          ).toLocaleDateString(navigator?.language ?? "en-US")}
                                        </p>

                                        {purchase.key_duration ? (
                                          <>
                                            <p className="text-xs">
                                              Duration: {purchase.key_duration}
                                            </p>
                                          </>
                                        ) : (
                                          <p className="text-xs">
                                            Duration: Lifetime
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </SheetContent>
                            </Sheet>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            className="w-half flex items-center justify-center py-2 mt-2 cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault()
                              router.push("/subscription-dashboard/bugreport")
                            }}
                          >
                            <BugOffIcon />
                            <span className="text-xs sm:text-sm">
                              Bug Report
                            </span>
                          </Button>

                          <Button
                            variant="outline"
                            className="w-half flex items-center justify-center py-2 mt-2 cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault()
                              router.push("/subscription-dashboard/suggestion")
                            }}
                          >
                            <MailPlus />
                            <span className="text-xs sm:text-sm">
                              Suggestion
                            </span>
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full grid grid-cols-2 gap-2 justify-center items-center mt-4">
                        <Button
                          variant="destructive"
                          className={cn(
                            "w-full max-w-xs bg-red-600 hover:bg-red-700 cursor-pointer"
                          )}
                          onClick={() => setSignOutDialog(true)}
                        >
                          Sign Out
                        </Button>
                        <Link href="/support">
                          <Button
                            variant="default"
                            className={cn(
                              "w-full max-w-x items-center cursor-pointer"
                            )}
                          >
                            Contact Support
                          </Button>
                        </Link>
                      </div>
                    )}

                    <div className="*:mt-3">
                      {/* honestly, idc... */}

                      {(!isBanned) && (
                        <>
                          {isLifetime ? (
                            <>
                              <RainbowButton
                                className="w-full"
                                onClick={() => setGiftKeyDialog(true)}
                              >
                                Send as Gift
                              </RainbowButton>

                              <Dialog
                                open={getGiftKeyDialog}
                                onOpenChange={setGiftKeyDialog}
                              >
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      🎁 Gift mspaint key
                                    </DialogTitle>
                                    <div className="text-muted-foreground text-xs sm:text-sm">
                                      <p>
                                        Thank you for purchasing mspaint lifetime.<br />
                                        If you&apos;re feeling generous you can buy mspaint keys for your friends, or giveaways!<br />
                                      </p>
                                    </div>
                                  </DialogHeader>
                                  <div className="flex flex-row gap-2">
                                    <p className="mt-2 text-sm text-gray-400">
                                      You can buy it here
                                    </p>
                                    <Link href="https://www.mspaint.cc/shop">
                                      <Button variant="secondary">Buy Subscription</Button>
                                    </Link>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </>
                          ) : (
                            <>
                              <RainbowButton
                                className="w-full"
                                onClick={() => setRedeemDialog(true)}
                              >
                                {isKeySystemMember ? "Buy Premium Key" : ((isExpired ? "Buy" : "Extend") + " Subscription")}
                              </RainbowButton>

                              <Dialog
                                open={getRedeemDialog}
                                onOpenChange={setRedeemDialog}
                              >
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Enter your key below.
                                    </DialogTitle>
                                    <div className="text-muted-foreground text-xs sm:text-sm">
                                      <p>Example, you can paste just the code:<br />
                                        &nbsp;<code className="text-stone-200">0123456789ABCDEF</code><br />
                                        Or the full link:<br />
                                        &nbsp;<code className="text-stone-200">https://www.mspaint.cc/purchase/completed?serial=0123456789ABCDEF</code>
                                      </p>
                                      <br />
                                      A new page will be created to claim the key.
                                    </div>

                                  </DialogHeader>
                                  <div className="flex flex-row gap-2">
                                    <Input placeholder="Enter key here..." value={key ?? ""} onChange={(event) => setKey(event.target.value)} className="text-[16px]" />
                                    <Button onClick={handleRedeem}>Redeem Key</Button>
                                  </div>
                                  <div className="flex flex-row gap-2">
                                    <p className="mt-2 text-sm text-gray-400">
                                      Don&apos;t have a key? You can buy it here
                                    </p>
                                    <Link href="https://www.mspaint.cc/shop">
                                      <Button variant="secondary">{isExpired ? "Buy" : "Extend"} Subscription</Button>
                                    </Link>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </>
                          )}
                          <Button
                            variant="destructive"
                            className="w-full bg-red-600 hover:bg-red-700 cursor-pointer"
                            onClick={() => setSignOutDialog(true)}
                          >
                            Sign Out
                          </Button>
                        </>
                      )}
                    </div>

                    <CardFooter className="w-full flex items-center justify-center text-muted-foreground text-xs font-medium mt-2 -mb-14">
                      User updated {lastSyncTimeText}
                    </CardFooter>
                  </>
                ) : (
                  <>
                    <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wider mt-2">
                      You&apos;re not a registered member.
                    </h3>
                    <Link href="/shop" className="w-full">
                      <RainbowButton className="w-full font-bold mt-2">
                        Buy mspaint
                      </RainbowButton>
                    </Link>

                    <Button
                      variant="destructive"
                      className={cn(
                        "w-full max-w-xs mt-2 bg-red-600 hover:bg-red-700 cursor-pointer"
                      )}
                      onClick={() => setSignOutDialog(true)}
                    >
                      Sign Out
                    </Button>
                  </>
                )}

                <AlertDialog
                  open={getSignOutDialog}
                  onOpenChange={setSignOutDialog}
                >
                  <AlertDialogContent className="max-w-xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you sure you want to Sign out?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        You can sign in at anytime by going through{" "}<Link
                          className="text-blue-400 underline break-all"
                          href="/sign-in"
                          target="_blank"
                        >
                          this link
                        </Link>.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                      <Button
                        variant="destructive"
                        className=" bg-red-600 hover:bg-red-700 cursor-pointer"
                        onClick={signout}
                      >
                        Sign Out
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isUnlink && isSubscriptionActive && (
        <p className="fixed left-0 bottom-0 mb-2 text-center w-full text-xs text-muted-foreground font-medium mt-1">
          Thank you for supporting mspaint ❤️
        </p>
      )}
    </div>
  );
}
