import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, ButuhPeran } from './auth/AuthContext'
import Aktivasi from './pages/Aktivasi'
import Daftar from './pages/Daftar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Pasien from './pages/Pasien'
import PatientDashboard from './pages/PatientDashboard'
import Upload from './pages/Upload'
import Workbench from './pages/Workbench'
import WorkbenchNyata from './pages/WorkbenchNyata'
import Worklist from './pages/Worklist'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/daftar" element={<Daftar />} />
        <Route path="/aktivasi" element={<Aktivasi />} />

        {/* Alur klinisi — produsen & validator hasil */}
        <Route
          path="/klinisi"
          element={
            <ButuhPeran peran="klinisi">
              <Worklist />
            </ButuhPeran>
          }
        />
        <Route
          path="/klinisi/kasus"
          element={
            <ButuhPeran peran="klinisi">
              <Worklist />
            </ButuhPeran>
          }
        />
        <Route
          path="/klinisi/kasus/:id"
          element={
            <ButuhPeran peran="klinisi">
              <Workbench />
            </ButuhPeran>
          }
        />
        {/* Kasus NYATA (hasil pipeline atas citra yang diunggah) punya rute sendiri, bukan
            menumpang /klinisi/kasus/:id. Halamannya berbeda isi — lihat WorkbenchNyata.tsx —
            dan memisahkannya di rute membuat "ini nyata atau contoh" terbaca dari URL. */}
        <Route
          path="/klinisi/nyata/:id"
          element={
            <ButuhPeran peran="klinisi">
              <WorkbenchNyata />
            </ButuhPeran>
          }
        />
        <Route
          path="/klinisi/unggah"
          element={
            <ButuhPeran peran="klinisi">
              <Upload />
            </ButuhPeran>
          }
        />
        <Route
          path="/klinisi/pasien"
          element={
            <ButuhPeran peran="klinisi">
              <Pasien />
            </ButuhPeran>
          }
        />

        {/* Alur pasien — konsumen read-only */}
        <Route
          path="/pasien"
          element={
            <ButuhPeran peran="pasien">
              <PatientDashboard />
            </ButuhPeran>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
