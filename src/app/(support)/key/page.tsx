"use client";

//import { redirect } from "next/navigation"

import { BlurFade } from "@/components/magicui/blur-fade";
import DotPattern from "@/components/magicui/dot-pattern";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export default function Page() {
  return (
    <main className="overflow-x-hidden">
      <DotPattern
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1}
        className={cn(
          "[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)] -z-50"
        )}
      />

      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="flex items-center justify-center">
          <BlurFade delay={0.2 + 1 * 0.05} inView>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center max-md:text-center">
                  <span className="self-center">Key System</span>
                </CardTitle>
              </CardHeader>

              <CardFooter className="flex px-5 gap-2 mb-[-5px] max-md:flex-col max-md:px-10">
                {/*<Link
                  href={
                    "https://ads.luarmor.net/get_key?for=mspaint_key_linkvertise-CwcwpnwnQoLj"
                  }
                  className="max-md:w-full"
                >
                  <Button className="cursor-pointer max-md:w-full">
                    Linkvertise{" "}
                    <Image
                      className="ml-2"
                      src="/icons/linkvertise.png"
                      width={25}
                      height={25}
                      alt="Linkvertise"
                    />
                  </Button>
                </Link>*/}

                <Link
                  href={
                    "https://ads.luarmor.net/get_key?for=mspaint_key_linkvertise-GmscbiEaJINm"
                  }
                  className="max-md:w-full"
                >
                  <Button className="cursor-pointer max-md:w-full">
                    Linkvertise{" "}
                    <Image
                      className="ml-2"
                      src="/icons/linkvertise.png"
                      width={25}
                      height={25}
                      alt="Linkvertise"
                    />
                  </Button>
                </Link>
              </CardFooter>

              <div className="text-center text-sm text-muted-foreground mb-3">
                <Link
                  href={"https://docs.mspaint.cc/key-system"}
                  className="transition duration-200 border-b-1 border-transparent hover:border-white hover:text-white"
                >
                  User Guide
                </Link>
              </div>
            </Card>
          </BlurFade>
        </div>
      </div>
    </main>
  );

  /*return redirect(
    "https://blog.mspaint.cc/mspaint-transitioning-subscription-model"
  );*/
}
