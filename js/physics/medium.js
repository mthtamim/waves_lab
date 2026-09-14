/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Medium & Refraction Physics Module
 */

export class MediumRefraction {
  /**
   * Refraction calculation using Snell's Law
   */
  static calculateRefraction(incidentAngleDeg, speed1, speed2) {
    const theta1Rad = (incidentAngleDeg * Math.PI) / 180;
    const sinTheta1 = Math.sin(theta1Rad);
    
    // sin(theta2) = (v2 / v1) * sin(theta1)
    const ratio = speed2 / speed1;
    const sinTheta2 = ratio * sinTheta1;
    
    let totalInternalReflection = false;
    let refractedAngleDeg = 0;
    let criticalAngleDeg = null;

    if (speed2 > speed1) {
      // Denser to rarer medium -> critical angle exists
      criticalAngleDeg = (Math.asin(speed1 / speed2) * 180) / Math.PI;
    }

    if (Math.abs(sinTheta2) > 1.0) {
      totalInternalReflection = true;
      refractedAngleDeg = 90;
    } else {
      refractedAngleDeg = (Math.asin(sinTheta2) * 180) / Math.PI;
    }

    return {
      incidentAngleDeg,
      refractedAngleDeg,
      speed1,
      speed2,
      speedRatio: ratio,
      totalInternalReflection,
      criticalAngleDeg
    };
  }

  /**
   * Returns wave speed at position r given medium boundary definition
   */
  static getSpeedAtPosition(pos, boundary = { z: 0, speedBefore: 4.0, speedAfter: 2.0 }) {
    if (pos.z < boundary.z) {
      return boundary.speedBefore;
    }
    return boundary.speedAfter;
  }
}
