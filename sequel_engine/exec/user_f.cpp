#include <iostream>
#include <string>
#include <fstream>
#include <cstdlib>
#include <math.h>

//#include "gnrl2.h"
//#include "user_f1.h"

void user_mbp_1(
   double* x,
   double* y,
   int* iparm,
   double* rparm);

void user_f_dtc_1(
   double* x,
   double* y,
   int* iparm,
   double* rparm);

using namespace std;

void user_f_1(
   double* x,
   double* y,
   int* iparm,
   double* rparm) {

   double a=0.5;
   int i1;

   i1 = iparm[0];
   if (i1 == 0) {
     a = 0.5;
   } else {
     a =2.0;
   }

   y[0] = a*rparm[0]*x[0] + rparm[1];
   return;
}

void user_f_eff_d(
   double* x,
   double* y,
   int* iparm,
   double* rparm) {

   double sigma,ls,vdc;
   double k;
   double wmr,isq,eff_d;

   sigma = rparm[0];
   ls    = rparm[1];  
   vdc   = rparm[2];  

   k = sigma*ls/(0.5*vdc);

// cout << "eff_d: k=" << k
//   << " sigma=" << sigma
//   << " ls=" << ls
//   << " vdc=" << vdc
//   << endl;

   wmr = x[0];
   isq = x[1];

   eff_d = k*wmr*isq;
   y[0] = eff_d;

// cout << "eff_d: y[0]=" << y[0] << endl;
   return;
}

void user_f_eff_q(
   double* x,
   double* y,
   int* iparm,
   double* rparm) {

   double sigma,ls,vdc;
   double k1,k2;
   double eff_q;
   double wmr,isd,imr;

   sigma = rparm[0];
   ls    = rparm[1];  
   vdc   = rparm[2];  

   k1 = sigma*ls/(0.5*vdc);
   k2 = (1.0-sigma)*ls/(0.5*vdc);

// cout << "eff_q: k1=" << k1
//   << " k2=" << k2
//   << " sigma=" << sigma
//   << " ls=" << ls
//   << " vdc=" << vdc
//   << endl;

   wmr = x[0];
   isd = x[1];
   imr = x[2];

   eff_q = (k1*wmr*isd + k2*wmr*imr);
   y[0] = eff_q;
// cout << "eff_q: y[0]=" << y[0] << endl;
   return;
}

void user_f_slip(
   double* x,
   double* y,
   int* iparm,
   double* rparm) {

   int poles;
   double tr;
   double w2,isq,imr,wrm,wmr;

   poles = iparm[0];
   tr    = rparm[0];

   isq = x[0];
   imr = x[1];
   wrm = x[2];

   if (fabs(imr) < 1.0e-2) {
     w2 = 1.0;
   } else {
     w2 = isq/(tr*imr);
   }

   wmr = 0.5*((double)(poles))*wrm + w2;

   y[0] = wmr;
   return;
}

void user_f_mux_1(
   const double time0,
   double* x,
   double* y,
   int* iparm,
   double* rparm) {

   double x1,x2,t0;

   x1 = x[0];
   x2 = x[1];
   t0 = rparm[0];

   if (time0 <= t0) {
     y[0] = x1;
     y[1] = 0.0;
   } else {
     y[0] = 0.0;
     y[1] = x2;
   }

   return;
}

void user_function(
   const int n_given,
   const double time0,
   double* x,
   double* y,
   int* iparm,
   double* rparm) {

// allow up to 2 iparms and 10 rparms

   double a = 2.0;

   switch(n_given)
   {
   case 1 :
//    simple example:
//    y[0] = a*rparm[0]*x[0] + rparm[1];

      user_f_1(x,y,iparm,rparm);
      break;
   case 2 :
      user_f_eff_d(x,y,iparm,rparm);
      break;
   case 3 :
      user_f_eff_q(x,y,iparm,rparm);
      break;
   case 4 :
      user_f_slip(x,y,iparm,rparm);
      break;
   case 5 :
      user_f_mux_1(time0,x,y,iparm,rparm);
      break;
   case 6 :
      cout << "user_function: n_given=6 is not implemented. Halting.." << endl; exit (1);
      break;
   case 7 :
      cout << "user_function: n_given=7 is not implemented. Halting.." << endl; exit (1);
      break;
   case 8 :
      cout << "user_function: n_given=8 is not implemented. Halting.." << endl; exit (1);
      break;
   case 9 :
      cout << "user_function: n_given=9 is not implemented. Halting.." << endl; exit (1);
      break;
   case 10 :
      cout << "user_function: n_given=10 is not implemented. Halting.." << endl; exit (1);
      break;
   case 501 :
      user_mbp_1(x,y,iparm,rparm);
      break;
   case 502 :
      user_f_dtc_1(x,y,iparm,rparm);
      break;
   default :
      cout << "user_function: Check n_given. Halting..." << endl;
      exit (1);
   }
   return;
}
