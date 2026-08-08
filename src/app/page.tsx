import { EditorProvider } from "@/components/providers/EditorProvider";
import { RoomProvider } from "@/components/providers/RoomProvider";
import { Scene } from "@/components/scene/Scene";
import { BottomBar } from "@/components/ui/BottomBar";
import { LeftSidebar } from "@/components/ui/LeftSidebar";
import { RightSidebar } from "@/components/ui/RightSidebar";
import { TopBar } from "@/components/ui/TopBar";
import { ViewportHud } from "@/components/ui/ViewportHud";

export default function Home() {
  return (
    <RoomProvider>
      <EditorProvider>
        <main className="relative h-screen w-screen overflow-hidden">
          {/* Lienzo WebGL a 100vh, por debajo de toda la HUD */}
          <Scene />

          {/* HUD superpuesta: no captura el puntero salvo en los paneles */}
          <div className="pointer-events-none relative z-10 flex h-screen w-screen flex-col">
            <div className="pointer-events-auto">
              <TopBar />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[206px_minmax(0,1fr)_296px] gap-3 p-4">
              <div className="pointer-events-auto min-h-0">
                <LeftSidebar />
              </div>

              {/* Ventana al lienzo: solo marco + controles */}
              <ViewportHud />

              <div className="pointer-events-auto min-h-0">
                <RightSidebar />
              </div>
            </div>

            <div className="pointer-events-auto">
              <BottomBar />
            </div>
          </div>
        </main>
      </EditorProvider>
    </RoomProvider>
  );
}
