import { AppLayout } from "@/components/layout/AppLayout"
import { ProtectedRoute } from "@/components/layout/ProtectedRoute"

export function HomeContent (){
    return (
    <>
    <div className='mt-3 gap-7'>   
        <span> Opa bom dia</span>
    </div>
    </>
    )
}

export default function Home() {
    <ProtectedRoute>
        <AppLayout >
            <HomeContent />
        </AppLayout>
    </ProtectedRoute>

}
