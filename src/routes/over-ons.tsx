import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getWpPage } from '../lib/wordpress/pages'


console.log(
  "GRAPHQL URL:",
  import.meta.env.VITE_WP_GRAPHQL_URL
)

export const Route = createFileRoute('/over-ons')({
  component: RouteComponent,
})


function RouteComponent() {

  const [page, setPage] = useState<any>(null)
const [error, setError] = useState<any>(null)


useEffect(() => {

  getWpPage('/over-ons/')
    .then((data) => {

      console.log("WORDPRESS DATA:", data)

      setPage(data)

    })
    .catch((err) => {

      console.error("WORDPRESS ERROR:", err)

      setError(err)

    })

}, [])


 if (error) {
  return <div>goed: {String(error)}</div>
}


if (!page) {
  return <div>Laden...</div>
}


  return (

    <main>


      <section className="bg-gray-50 py-24">

        <div className="mx-auto max-w-6xl px-6">


          <p className="mb-4 text-sm font-semibold uppercase tracking-wider">
            Over Werkgenoten
          </p>


          <h1 className="max-w-4xl text-5xl font-bold leading-tight">
            {page.title}
          </h1>


          <div
            className="mt-8 max-w-3xl text-lg text-gray-600"
            dangerouslySetInnerHTML={{
              __html: page.content
            }}
          />


        </div>

      </section>


    </main>

  )
}