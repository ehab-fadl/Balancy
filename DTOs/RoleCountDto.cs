namespace Balancy.DTOs
{
    public class RoleCountDto
    {
        public int AdminCount { get; set; }
        public int DoctorCount { get; set; }
        public int SearcherCount { get; set; }
        public int NullUserCount { get; set; }

        public int Total => AdminCount + DoctorCount + SearcherCount + NullUserCount;

        public int AdminPercent => Total == 0 ? 0 : (AdminCount * 100) / Total;
        public int DoctorPercent => Total == 0 ? 0 : (DoctorCount * 100) / Total;
        public int SearcherPercent => Total == 0 ? 0 : (SearcherCount * 100) / Total;
        public int NullUserPercent => Total == 0 ? 0 : (NullUserCount * 100) / Total;
    }
}
