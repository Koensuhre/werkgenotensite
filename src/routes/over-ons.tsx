import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/over-ons')({
  component: RouteComponent,
})

export function PageTemplate() {
  return (
    <>
      <Hero />
      <Trust />
      <HowItWorks />
      <Categories />
      <FeaturedJobs />
      <Stats />
      <Testimonials />
      <Pricing />
      <CTA />
    </>
  );
}


function RouteComponent() {
    return (
       <>
         {/* Plak hier de secties die je uit PageTemplate.tsx wilt gebruiken */}
       </>
     );
   }

   